package com.hotel.dao;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Abre conexões JDBC com o PostgreSQL.
 *
 * A URL, o usuário e a senha vêm do application.properties
 * (na sua máquina, do arquivo banco.properties; na nuvem, das variáveis de ambiente).
 */
@Component
public class ConexaoBD {

    private static final String DRIVER = "org.postgresql.Driver";

    private final String url;
    private final String usuario;
    private final String senha;

    public ConexaoBD(@Value("${javahotel.bd.url}") String url,
                     @Value("${javahotel.bd.usuario}") String usuario,
                     @Value("${javahotel.bd.senha}") String senha) {
        this.url = url;
        this.usuario = usuario;
        this.senha = senha;

        // Carrega o driver do PostgreSQL, para o JDBC reconhecer URLs "jdbc:postgresql://".
        try {
            Class.forName(DRIVER);
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException("Driver JDBC do PostgreSQL não encontrado: " + e.getMessage(), e);
        }
        // Se o banco não responder em 10 segundos, desiste (em vez de travar o site).
        DriverManager.setLoginTimeout(10);
    }

    /** Cria a ponte com o banco de dados. Quem chama deve fechar a conexão (try-with-resources). */
    public Connection conectar() throws SQLException {
        return DriverManager.getConnection(url, usuario, senha);
    }

    public String getUrl() {
        return url;
    }
}
