package com.hotel.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import com.hotel.model.Hospede;
import com.hotel.model.Reserva;
import com.hotel.model.StatusReserva;

/** Acesso à tabela reserva (junto com o hóspede e o total do frigobar). */
public class ReservaDAO {

    /** Reserva + dados do hóspede + soma do que foi consumido no frigobar. */
    private static final String SELECT = """
            SELECT r.id, r.quarto, r.status, r.entrada, r.saida,
                   r.criada_em, r.checkin_em, r.finalizada_em,
                   h.id AS hospede_id, h.nome, h.email, h.telefone,
                   COALESCE((SELECT SUM(c.quantidade * c.preco_unitario)
                             FROM consumo c
                             WHERE c.reserva_id = r.id), 0) AS valor_consumido
            FROM reserva r
            JOIN hospede h ON h.id = r.hospede_id
            """;

    private final Connection conexao;

    public ReservaDAO(Connection conexao) {
        this.conexao = conexao;
    }

    public List<Reserva> listar() throws SQLException {
        List<Reserva> reservas = new ArrayList<>();
        try (PreparedStatement stmt = conexao.prepareStatement(SELECT + " ORDER BY r.id");
             ResultSet resultado = stmt.executeQuery()) {
            while (resultado.next()) {
                reservas.add(ler(resultado));
            }
        }
        return reservas;
    }

    /** Devolve a reserva, ou null se não existir. */
    public Reserva buscarPorId(int id) throws SQLException {
        try (PreparedStatement stmt = conexao.prepareStatement(SELECT + " WHERE r.id = ?")) {
            stmt.setInt(1, id);
            return lerUma(stmt);
        }
    }

    /**
     * Primeira reserva ativa do quarto cujo período se sobrepõe a [entrada, saida), ou null.
     * Dois períodos se sobrepõem quando cada um começa antes do outro terminar.
     */
    public Reserva buscarConflito(int quarto, LocalDate entrada, LocalDate saida, int ignorarId) throws SQLException {
        String sql = SELECT + """
                WHERE r.quarto = ?
                  AND r.status <> 'finalizada'
                  AND r.id <> ?
                  AND ? < r.saida
                  AND r.entrada < ?
                ORDER BY r.entrada
                LIMIT 1
                """;
        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {
            stmt.setInt(1, quarto);
            stmt.setInt(2, ignorarId);
            stmt.setObject(3, entrada);
            stmt.setObject(4, saida);
            return lerUma(stmt);
        }
    }

    /** Reserva com hóspede dentro do quarto agora (no máximo uma por quarto), ou null. */
    public Reserva buscarHospedadaDoQuarto(int quarto) throws SQLException {
        String sql = SELECT + " WHERE r.quarto = ? AND r.status = 'hospedada' LIMIT 1";
        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {
            stmt.setInt(1, quarto);
            return lerUma(stmt);
        }
    }

    /** Grava uma nova reserva e preenche o id e a data de criação. */
    public void inserir(Reserva reserva) throws SQLException {
        String sql = """
                INSERT INTO reserva (quarto, hospede_id, status, entrada, saida)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id, criada_em
                """;
        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {
            stmt.setInt(1, reserva.getQuarto());
            stmt.setInt(2, reserva.getHospede().getId());
            stmt.setString(3, reserva.getStatus().getCodigo());
            stmt.setObject(4, reserva.getEntrada());
            stmt.setObject(5, reserva.getSaida());
            try (ResultSet resultado = stmt.executeQuery()) {
                resultado.next();
                reserva.setId(resultado.getInt("id"));
                reserva.setCriadaEm(instante(resultado, "criada_em"));
            }
        }
    }

    /** Atualiza quarto, hóspede e datas. */
    public void atualizar(Reserva reserva) throws SQLException {
        String sql = "UPDATE reserva SET quarto = ?, hospede_id = ?, entrada = ?, saida = ? WHERE id = ?";
        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {
            stmt.setInt(1, reserva.getQuarto());
            stmt.setInt(2, reserva.getHospede().getId());
            stmt.setObject(3, reserva.getEntrada());
            stmt.setObject(4, reserva.getSaida());
            stmt.setInt(5, reserva.getId());
            stmt.executeUpdate();
        }
    }

    public void registrarCheckin(int id) throws SQLException {
        String sql = "UPDATE reserva SET status = 'hospedada', checkin_em = now() WHERE id = ?";
        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {
            stmt.setInt(1, id);
            stmt.executeUpdate();
        }
    }

    /** Encerra a estadia, guardando a data real de saída. */
    public void finalizar(int id, LocalDate saida) throws SQLException {
        String sql = "UPDATE reserva SET status = 'finalizada', finalizada_em = now(), saida = ? WHERE id = ?";
        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {
            stmt.setObject(1, saida);
            stmt.setInt(2, id);
            stmt.executeUpdate();
        }
    }

    public void excluir(int id) throws SQLException {
        try (PreparedStatement stmt = conexao.prepareStatement("DELETE FROM reserva WHERE id = ?")) {
            stmt.setInt(1, id);
            stmt.executeUpdate();
        }
    }

    /* ---------- Leitura do ResultSet ---------- */

    private static Reserva lerUma(PreparedStatement stmt) throws SQLException {
        try (ResultSet resultado = stmt.executeQuery()) {
            return resultado.next() ? ler(resultado) : null;
        }
    }

    private static Reserva ler(ResultSet resultado) throws SQLException {
        Hospede hospede = new Hospede(
                resultado.getString("nome"),
                resultado.getString("email"),
                resultado.getString("telefone"));
        hospede.setId(resultado.getInt("hospede_id"));

        Reserva reserva = new Reserva();
        reserva.setId(resultado.getInt("id"));
        reserva.setQuarto(resultado.getInt("quarto"));
        reserva.setHospede(hospede);
        reserva.setStatus(StatusReserva.deCodigo(resultado.getString("status")));
        reserva.setEntrada(resultado.getObject("entrada", LocalDate.class));
        reserva.setSaida(resultado.getObject("saida", LocalDate.class));
        reserva.setValorConsumido(resultado.getBigDecimal("valor_consumido"));
        reserva.setCriadaEm(instante(resultado, "criada_em"));
        reserva.setCheckinEm(instante(resultado, "checkin_em"));
        reserva.setFinalizadaEm(instante(resultado, "finalizada_em"));
        return reserva;
    }

    /** Data e hora gravadas (ou null), em milissegundos, que é a precisão que o navegador entende. */
    private static Instant instante(ResultSet resultado, String coluna) throws SQLException {
        OffsetDateTime valor = resultado.getObject(coluna, OffsetDateTime.class);
        return valor == null ? null : valor.toInstant().truncatedTo(ChronoUnit.MILLIS);
    }
}
