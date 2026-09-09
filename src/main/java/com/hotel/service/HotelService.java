package com.hotel.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.hotel.model.Hospede;
import com.hotel.model.ProdutoFrigobar;
import com.hotel.model.Quarto;

@Service
public class HotelService {

    private static final int TOTAL_QUARTOS = 20;

    private final List<Quarto> quartos = new ArrayList<>();
    private final List<ProdutoFrigobar> produtos = new ArrayList<>();

    public HotelService() {
        for (int i = 1; i <= TOTAL_QUARTOS; i++) {
            quartos.add(new Quarto(i));
        }

        produtos.add(new ProdutoFrigobar("Agua Mineral 500ml", 3.50, 20));
        produtos.add(new ProdutoFrigobar("Refrigerante Lata", 6.00, 15));
        produtos.add(new ProdutoFrigobar("Suco de Laranja", 7.00, 10));
        produtos.add(new ProdutoFrigobar("Cerveja Long Neck", 9.00, 12));
        produtos.add(new ProdutoFrigobar("Chocolate ao Leite", 5.50, 18));
    }

    public List<Quarto> listarQuartos() {
        return quartos;
    }

    public List<ProdutoFrigobar> listarProdutos() {
        return produtos;
    }

    private Quarto buscarQuarto(int numero) {
        for (Quarto q : quartos) {
            if (q.getNumero() == numero) return q;
        }
        return null;
    }

    public String reservar(int numero, String nome, String email, String telefone) {
        Quarto q = buscarQuarto(numero);
        if (q == null) return "Quarto invalido.";
        if (q.isOcupado()) return "Quarto " + numero + " ja esta ocupado.";
        q.reservar(new Hospede(nome, email, telefone));
        return "Quarto " + numero + " reservado com sucesso para " + nome + ".";
    }

    public String cancelar(int numero) {
        Quarto q = buscarQuarto(numero);
        if (q == null) return "Quarto invalido.";
        if (!q.isOcupado()) return "Quarto " + numero + " ja esta livre.";
        q.cancelarReserva();
        return "Reserva do quarto " + numero + " cancelada.";
    }

    public String registrarConsumo(int numeroQuarto, int indiceProduto, int quantidade) {
        Quarto q = buscarQuarto(numeroQuarto);
        if (q == null || !q.isOcupado()) return "Quarto invalido ou sem hospede.";
        if (indiceProduto < 0 || indiceProduto >= produtos.size()) return "Produto invalido.";

        ProdutoFrigobar produto = produtos.get(indiceProduto);
        if (quantidade <= 0 || quantidade > produto.getQuantidade()) {
            return "Quantidade invalida. Estoque disponivel: " + produto.getQuantidade();
        }

        produto.setQuantidade(produto.getQuantidade() - quantidade);
        double valor = produto.calcularTotal(quantidade);
        q.adicionarConsumo(valor);
        return String.format("Consumo registrado! Valor: R$ %.2f", valor);
    }
}
