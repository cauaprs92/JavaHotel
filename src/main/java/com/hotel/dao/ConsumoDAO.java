package com.hotel.dao;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

/** Acesso à tabela consumo: cada produto do frigobar lançado na conta de uma reserva. */
public class ConsumoDAO {

    private final Connection conexao;

    public ConsumoDAO(Connection conexao) {
        this.conexao = conexao;
    }

    public void inserir(int reservaId, int produtoId, int quantidade, BigDecimal precoUnitario) throws SQLException {
        String sql = "INSERT INTO consumo (reserva_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)";
        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {
            stmt.setInt(1, reservaId);
            stmt.setInt(2, produtoId);
            stmt.setInt(3, quantidade);
            stmt.setBigDecimal(4, precoUnitario);
            stmt.executeUpdate();
        }
    }
}
