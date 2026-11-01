package com.hotel.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import com.hotel.model.Hospede;

/** Acesso à tabela hospede. */
public class HospedeDAO {

    private final Connection conexao;

    public HospedeDAO(Connection conexao) {
        this.conexao = conexao;
    }

    /**
     * Grava o hóspede e preenche o id dele.
     * Se já existe alguém com o mesmo e-mail, reaproveita o cadastro e atualiza nome e telefone.
     */
    public void salvar(Hospede hospede) throws SQLException {
        String sql = """
                INSERT INTO hospede (nome, email, telefone) VALUES (?, ?, ?)
                ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, telefone = EXCLUDED.telefone
                RETURNING id
                """;
        try (PreparedStatement stmt = conexao.prepareStatement(sql)) {
            stmt.setString(1, hospede.getNome());
            stmt.setString(2, hospede.getEmail());
            stmt.setString(3, hospede.getTelefone());
            try (ResultSet resultado = stmt.executeQuery()) {
                resultado.next();
                hospede.setId(resultado.getInt("id"));
            }
        }
    }
}
