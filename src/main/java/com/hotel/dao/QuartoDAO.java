package com.hotel.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import com.hotel.model.Quarto;

/** Acesso à tabela quarto. */
public class QuartoDAO {

    private final Connection conexao;

    public QuartoDAO(Connection conexao) {
        this.conexao = conexao;
    }

    public List<Quarto> listar() throws SQLException {
        String sql = "SELECT numero, andar FROM quarto ORDER BY numero";
        List<Quarto> quartos = new ArrayList<>();
        try (PreparedStatement stmt = conexao.prepareStatement(sql);
             ResultSet resultado = stmt.executeQuery()) {
            while (resultado.next()) {
                quartos.add(new Quarto(resultado.getInt("numero"), resultado.getInt("andar")));
            }
        }
        return quartos;
    }

    public boolean existe(int numero) throws SQLException {
        String sql = "SELECT 1 FROM quarto WHERE numero = ?";
        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {
            stmt.setInt(1, numero);
            try (ResultSet resultado = stmt.executeQuery()) {
                return resultado.next();
            }
        }
    }
}
