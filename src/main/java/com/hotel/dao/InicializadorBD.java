package com.hotel.dao;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Prepara o banco quando o servidor inicia: cria as tabelas que faltam
 * (banco/schema.sql) e coloca os quartos e produtos iniciais (banco/dados-iniciais.sql).
 */
@Component
public class InicializadorBD implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InicializadorBD.class);

    private static final String SCRIPT_TABELAS = "banco/schema.sql";
    private static final String SCRIPT_DADOS = "banco/dados-iniciais.sql";

    private final ConexaoBD conexaoBD;

    public InicializadorBD(ConexaoBD conexaoBD) {
        this.conexaoBD = conexaoBD;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conexao = conexaoBD.conectar();
             Statement stmt = conexao.createStatement()) {
            stmt.execute(lerScript(SCRIPT_TABELAS));
            stmt.execute(lerScript(SCRIPT_DADOS));
            log.info("Banco de dados pronto em {}", conexaoBD.getUrl());
        } catch (SQLException e) {
            // O site continua no ar e mostra o aviso; o detalhe fica aqui no terminal.
            log.error("Não foi possível preparar o banco em {}: {} ({})",
                    conexaoBD.getUrl(), ErrosBD.descrever(e), e.getMessage());
        }
    }

    /** Apaga reservas, hóspedes e consumos e volta o estoque do frigobar ao inicial. */
    public void redefinir(Connection conexao) throws SQLException {
        try (Statement stmt = conexao.createStatement()) {
            stmt.execute("TRUNCATE consumo, reserva, hospede, produto RESTART IDENTITY");
            stmt.execute(lerScript(SCRIPT_DADOS));
        }
    }

    private static String lerScript(String caminho) {
        try (InputStream entrada = new ClassPathResource(caminho).getInputStream()) {
            return new String(entrada.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível ler o script " + caminho, e);
        }
    }
}
