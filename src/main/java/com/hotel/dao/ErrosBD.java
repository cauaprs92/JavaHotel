package com.hotel.dao;

import java.sql.SQLException;

/**
 * Traduz uma SQLException em uma mensagem que diga o que fazer.
 * Usa o SQLState, o código padrão de erro que todo banco devolve pelo JDBC.
 */
public final class ErrosBD {

    private ErrosBD() {
    }

    public static String descrever(SQLException e) {
        String estado = e.getSQLState() == null ? "" : e.getSQLState();
        return switch (estado) {
            case "3D000" -> "O banco de dados não existe. Crie-o no PostgreSQL com: CREATE DATABASE javahotel;";
            case "28P01", "28000" -> "Usuário ou senha do banco de dados incorretos. Confira o banco.properties (ou DB_USER e DB_PASSWORD).";
            case "42P01" -> "As tabelas do banco de dados não existem. Reinicie o servidor para criá-las.";
            case "40P01", "40001", "55P03" -> "O banco de dados estava ocupado. Tente de novo.";
            default -> estado.startsWith("08")
                    ? "Não foi possível conectar ao PostgreSQL. Verifique se ele está rodando."
                    : "Erro no banco de dados. Veja os detalhes no terminal do servidor.";
        };
    }
}
