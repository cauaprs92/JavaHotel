package com.hotel.service;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.hotel.dao.ConexaoBD;
import com.hotel.dao.ConsumoDAO;
import com.hotel.dao.HospedeDAO;
import com.hotel.dao.InicializadorBD;
import com.hotel.dao.ProdutoDAO;
import com.hotel.dao.QuartoDAO;
import com.hotel.dao.ReservaDAO;
import com.hotel.model.EstadoHotel;
import com.hotel.model.Hospede;
import com.hotel.model.ItemConsumo;
import com.hotel.model.ProdutoFrigobar;
import com.hotel.model.Reserva;
import com.hotel.model.StatusReserva;

/**
 * Regras do hotel: reservas, check-in, encerramento e frigobar.
 *
 * Cada operação abre uma conexão, faz tudo dentro de uma transação e confirma (commit)
 * no final. Se uma regra falhar no meio, nada é gravado (rollback).
 *
 * Regras do período: a reserva vale de [entrada, saida). O dia da saída de um hóspede
 * pode ser o dia de entrada do próximo, mas duas reservas ativas no mesmo quarto
 * nunca podem ter períodos que se sobrepõem.
 */
@Service
public class HotelService {

    private static final Locale BRASIL = Locale.of("pt", "BR");
    private static final DateTimeFormatter DIA_MES = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter DIA_MES_ANO = DateTimeFormatter.ofPattern("dd/MM/yy");

    // Mesmos limites das colunas da tabela hospede.
    private static final int MAX_NOME = 120;
    private static final int MAX_EMAIL = 160;

    /** Celular "(11) 90000-0000" (começa com 9) ou fixo "(11) 3000-0000" (começa com 2 a 5), DDD de 11 a 99. */
    private static final Pattern TELEFONE = Pattern.compile("\\([1-9]\\d\\) (9\\d{4}|[2-5]\\d{3})-\\d{4}");

    private final ConexaoBD conexaoBD;
    private final InicializadorBD inicializadorBD;
    private final ZoneId fuso;

    public HotelService(ConexaoBD conexaoBD, InicializadorBD inicializadorBD,
                        @Value("${javahotel.fuso}") String fuso) {
        this.conexaoBD = conexaoBD;
        this.inicializadorBD = inicializadorBD;
        this.fuso = ZoneId.of(fuso);
    }

    /* ---------- Consultas ---------- */

    /** Quartos, reservas e produtos, lidos juntos para a tela ficar coerente. */
    public EstadoHotel carregarEstado() throws SQLException {
        return consultar(conexao -> new EstadoHotel(
                new QuartoDAO(conexao).listar(),
                new ReservaDAO(conexao).listar(),
                new ProdutoDAO(conexao).listar()));
    }

    /* ---------- Reservas ---------- */

    public String reservar(Integer quarto, String nome, String email, String telefone,
                           String entrada, String saida) throws SQLException {
        return alterar(conexao -> {
            ReservaDAO reservas = new ReservaDAO(conexao);
            if (quarto == null || !new QuartoDAO(conexao).existe(quarto)) {
                throw erro("Escolha um quarto válido.");
            }
            Periodo periodo = validarPeriodo(lerData(entrada), lerData(saida), true);
            Reserva conflito = reservas.buscarConflito(quarto, periodo.entrada(), periodo.saida(), 0);
            if (conflito != null) throw erro(descreverConflito(conflito));
            Hospede hospede = validarHospede(nome, email, telefone);

            new HospedeDAO(conexao).salvar(hospede);
            Reserva reserva = new Reserva();
            reserva.setQuarto(quarto);
            reserva.setHospede(hospede);
            reserva.setStatus(StatusReserva.AGENDADA);
            reserva.setEntrada(periodo.entrada());
            reserva.setSaida(periodo.saida());
            reservas.inserir(reserva);

            return "Reserva #" + reserva.getCodigo() + " criada no quarto " + quarto
                    + ", de " + dataCurta(periodo.entrada()) + " a " + dataCurta(periodo.saida()) + " · Agendado.";
        });
    }

    public String fazerCheckin(int id) throws SQLException {
        return alterar(conexao -> {
            ReservaDAO reservas = new ReservaDAO(conexao);
            Reserva r = reservas.buscarPorId(id);
            if (r == null || r.getStatus() != StatusReserva.AGENDADA) {
                throw erro("Só reservas com status Agendado podem fazer check-in.");
            }
            if (hoje().isBefore(r.getEntrada())) {
                throw erro("O check-in desta reserva é a partir de " + dataCurta(r.getEntrada()) + ".");
            }
            Reserva ocupante = reservas.buscarHospedadaDoQuarto(r.getQuarto());
            if (ocupante != null) {
                throw erro("O quarto " + r.getQuarto() + " ainda está com " + ocupante.getHospede().getNome()
                        + " (reserva #" + ocupante.getCodigo() + "). Encerre essa estadia antes.");
            }
            reservas.registrarCheckin(id);
            return "Check-in da reserva #" + r.getCodigo() + " feito: " + r.getHospede().getNome()
                    + " está no quarto " + r.getQuarto() + ".";
        });
    }

    public String cancelarAgendamento(int id) throws SQLException {
        return alterar(conexao -> {
            ReservaDAO reservas = new ReservaDAO(conexao);
            Reserva r = reservas.buscarPorId(id);
            if (r == null || r.getStatus() != StatusReserva.AGENDADA) {
                throw erro("Só reservas com status Agendado podem ser canceladas.");
            }
            reservas.excluir(id);
            return "Reserva #" + r.getCodigo() + " cancelada. O quarto " + r.getQuarto() + " está livre.";
        });
    }

    /** Encerra a estadia. Com consumo no frigobar, exige a confirmação do pagamento. */
    public String finalizarReserva(int id, boolean pagamentoConfirmado) throws SQLException {
        return alterar(conexao -> {
            ReservaDAO reservas = new ReservaDAO(conexao);
            Reserva r = reservas.buscarPorId(id);
            if (r == null || r.getStatus() != StatusReserva.HOSPEDADA) {
                throw erro("Só reservas com hóspede no hotel podem ser encerradas.");
            }
            if (r.temConsumo() && !pagamentoConfirmado) {
                throw erro("Confirme o pagamento do frigobar para encerrar.");
            }
            // Saiu antes do previsto: o histórico guarda a data real de saída.
            LocalDate hoje = hoje();
            LocalDate saida = hoje.isBefore(r.getSaida()) && hoje.isAfter(r.getEntrada()) ? hoje : r.getSaida();
            reservas.finalizar(id, saida);
            return "Reserva #" + r.getCodigo() + " encerrada · Finalizado.";
        });
    }

    /**
     * Atualiza hóspede, quarto e datas. Com hóspede no hotel, a data de entrada não muda
     * (só dá para mudar a saída, por exemplo para estender a estadia).
     */
    public String editarReserva(int id, Integer novoQuarto, String nome, String email, String telefone,
                                String entrada, String saida) throws SQLException {
        return alterar(conexao -> {
            ReservaDAO reservas = new ReservaDAO(conexao);
            Reserva r = reservas.buscarPorId(id);
            if (r == null || !r.isAtiva()) throw erro("Essa reserva não pode mais ser editada.");
            Hospede hospede = validarHospede(nome, email, telefone);
            if (novoQuarto == null || !new QuartoDAO(conexao).existe(novoQuarto)) {
                throw erro("Escolha um quarto válido.");
            }
            int quarto = novoQuarto;
            boolean hospedada = r.getStatus() == StatusReserva.HOSPEDADA;
            LocalDate novaEntrada = hospedada ? r.getEntrada() : lerData(entrada);
            Periodo periodo = validarPeriodo(novaEntrada, lerData(saida), !Objects.equals(novaEntrada, r.getEntrada()));

            boolean trocou = quarto != r.getQuarto();
            if (hospedada && trocou && reservas.buscarHospedadaDoQuarto(quarto) != null) {
                throw erro("O quarto " + quarto + " está com outro hóspede agora.");
            }
            Reserva conflito = reservas.buscarConflito(quarto, periodo.entrada(), periodo.saida(), r.getId());
            if (conflito != null) throw erro(descreverConflito(conflito));

            new HospedeDAO(conexao).salvar(hospede);
            r.setHospede(hospede);
            r.setQuarto(quarto);
            r.setEntrada(periodo.entrada());
            r.setSaida(periodo.saida());
            reservas.atualizar(r);

            return trocou
                    ? "Reserva #" + r.getCodigo() + ": " + hospede.getNome() + " foi para o quarto " + quarto + "."
                    : "Reserva #" + r.getCodigo() + " atualizada.";
        });
    }

    /* ---------- Frigobar ---------- */

    private record Lancamento(ProdutoFrigobar produto, int quantidade) {
    }

    /**
     * Lança vários produtos de uma vez na reserva hospedada do quarto.
     * Confere tudo antes; se algum produto falhar, nada é lançado.
     */
    public String registrarConsumo(Integer quarto, List<ItemConsumo> itens) throws SQLException {
        return alterar(conexao -> {
            Reserva r = quarto == null ? null : new ReservaDAO(conexao).buscarHospedadaDoQuarto(quarto);
            if (r == null) throw erro("Escolha um quarto com hóspede no hotel.");

            // Soma as quantidades de cada produto (o mesmo produto pode vir mais de uma vez).
            Map<Integer, Long> pedidos = new LinkedHashMap<>();
            if (itens != null) {
                for (ItemConsumo item : itens) {
                    if (item == null || item.quantidade() == null || item.quantidade() <= 0) continue;
                    if (item.produtoId() == null) throw erro("Produto inválido.");
                    pedidos.merge(item.produtoId(), (long) item.quantidade(), Long::sum);
                }
            }
            if (pedidos.isEmpty()) throw erro("Adicione pelo menos um produto.");

            ProdutoDAO produtos = new ProdutoDAO(conexao);
            List<Lancamento> lancamentos = new ArrayList<>();
            for (Map.Entry<Integer, Long> pedido : pedidos.entrySet()) {
                ProdutoFrigobar produto = produtos.buscarPorId(pedido.getKey());
                if (produto == null) throw erro("Produto inválido.");
                if (pedido.getValue() > produto.getQuantidade()) {
                    throw erro(produto.getNomeProduto() + ": só há " + produto.getQuantidade() + " em estoque.");
                }
                lancamentos.add(new Lancamento(produto, pedido.getValue().intValue()));
            }

            ConsumoDAO consumos = new ConsumoDAO(conexao);
            BigDecimal valor = BigDecimal.ZERO;
            int unidades = 0;
            for (Lancamento l : lancamentos) {
                ProdutoFrigobar produto = l.produto();
                if (!produtos.baixarEstoque(produto.getId(), l.quantidade())) {
                    throw erro(produto.getNomeProduto() + ": estoque insuficiente.");
                }
                consumos.inserir(r.getId(), produto.getId(), l.quantidade(), produto.getPreco());
                valor = valor.add(produto.calcularTotal(l.quantidade()));
                unidades += l.quantidade();
            }
            String rotulo = unidades == 1 ? "1 item lançado" : unidades + " itens lançados";
            return rotulo + " no quarto " + quarto + " · " + brl(valor) + ".";
        });
    }

    /* ---------- Dados de exemplo ---------- */

    public String redefinir() throws SQLException {
        return alterar(conexao -> {
            inicializadorBD.redefinir(conexao);
            return "Dados de exemplo restaurados.";
        });
    }

    /* ---------- Validações ---------- */

    private record Periodo(LocalDate entrada, LocalDate saida) {
    }

    private Periodo validarPeriodo(LocalDate entrada, LocalDate saida, boolean exigirFuturo) {
        if (entrada == null || saida == null) throw erro("Informe as datas de check-in e check-out.");
        if (!saida.isAfter(entrada)) throw erro("O check-out precisa ser depois do check-in.");
        if (exigirFuturo && entrada.isBefore(hoje())) throw erro("O check-in não pode ser em uma data que já passou.");
        return new Periodo(entrada, saida);
    }

    private static Hospede validarHospede(String nome, String email, String telefone) {
        nome = nome == null ? "" : nome.trim();
        email = email == null ? "" : email.trim();
        telefone = telefone == null ? "" : telefone.trim();
        if (nome.isEmpty() || email.isEmpty() || telefone.isEmpty()) throw erro("Preencha nome, e-mail e telefone.");
        if (nome.length() > MAX_NOME) throw erro("O nome pode ter até " + MAX_NOME + " caracteres.");
        if (email.length() > MAX_EMAIL || !email.matches("[^@\\s]+@[^@\\s]+")) throw erro("Informe um e-mail válido.");
        if (!TELEFONE.matcher(telefone).matches()) throw erro("Informe um telefone válido, como (11) 90000-0000.");
        return new Hospede(nome, email, telefone);
    }

    /** Data no formato AAAA-MM-DD, ou null se vier vazia ou inválida. */
    private static LocalDate lerData(String texto) {
        if (texto == null) return null;
        try {
            return LocalDate.parse(texto.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private String descreverConflito(Reserva c) {
        return "O quarto " + c.getQuarto() + " já está reservado de " + dataCurta(c.getEntrada())
                + " a " + dataCurta(c.getSaida()) + " (reserva #" + c.getCodigo() + ").";
    }

    private static RegraNegocioException erro(String mensagem) {
        return new RegraNegocioException(mensagem);
    }

    /* ---------- Formatação (igual à do site) ---------- */

    private LocalDate hoje() {
        return LocalDate.now(fuso);
    }

    /** "31/10", ou "31/10/27" quando o ano é outro. */
    private String dataCurta(LocalDate data) {
        return data.format(data.getYear() == hoje().getYear() ? DIA_MES : DIA_MES_ANO);
    }

    private static String brl(BigDecimal valor) {
        return NumberFormat.getCurrencyInstance(BRASIL).format(valor);
    }

    /* ---------- Transações ---------- */

    @FunctionalInterface
    private interface TarefaBD<T> {
        T executar(Connection conexao) throws SQLException;
    }

    /** Só leitura: todas as consultas enxergam o banco no mesmo instante. */
    private <T> T consultar(TarefaBD<T> tarefa) throws SQLException {
        try (Connection conexao = conexaoBD.conectar()) {
            conexao.setReadOnly(true);
            conexao.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            return emTransacao(conexao, tarefa);
        }
    }

    /**
     * Alteração: antes de tudo, trava a tabela de reservas para escrita. Assim, duas pessoas
     * não conseguem, por exemplo, reservar o mesmo quarto ao mesmo tempo; a segunda espera a
     * primeira terminar e depois vê o quarto já ocupado. Consultas continuam liberadas.
     */
    private <T> T alterar(TarefaBD<T> tarefa) throws SQLException {
        try (Connection conexao = conexaoBD.conectar()) {
            return emTransacao(conexao, c -> {
                try (Statement stmt = c.createStatement()) {
                    stmt.execute("LOCK TABLE reserva IN EXCLUSIVE MODE");
                }
                return tarefa.executar(c);
            });
        }
    }

    private static <T> T emTransacao(Connection conexao, TarefaBD<T> tarefa) throws SQLException {
        conexao.setAutoCommit(false);
        try {
            T resultado = tarefa.executar(conexao);
            conexao.commit();
            return resultado;
        } catch (SQLException | RuntimeException e) {
            try {
                conexao.rollback();
            } catch (SQLException falhaNoRollback) {
                e.addSuppressed(falhaNoRollback);
            }
            throw e;
        }
    }
}
