package com.hotel.controller;

import java.sql.SQLException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.hotel.controller.HotelApiController.Resposta;
import com.hotel.dao.ErrosBD;
import com.hotel.service.RegraNegocioException;

/** Transforma as exceções da API em { "ok": false, "msg": "..." } para o site mostrar. */
@RestControllerAdvice(assignableTypes = HotelApiController.class)
public class TratadorDeErros {

    private static final Logger log = LoggerFactory.getLogger(TratadorDeErros.class);

    /** Regra do hotel não atendida: 400, com a mensagem da regra. */
    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<Resposta> regra(RegraNegocioException e) {
        return responder(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    /** Falha no banco: 503, com uma mensagem do que fazer. O detalhe fica no terminal. */
    @ExceptionHandler(SQLException.class)
    public ResponseEntity<Resposta> banco(SQLException e) {
        log.error("Erro no banco de dados (SQLState {}): {}", e.getSQLState(), e.getMessage());
        return responder(HttpStatus.SERVICE_UNAVAILABLE, ErrosBD.descrever(e));
    }

    @ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class })
    public ResponseEntity<Resposta> pedidoInvalido(Exception e) {
        return responder(HttpStatus.BAD_REQUEST, "Os dados enviados estão incompletos ou em formato inválido.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Resposta> inesperado(Exception e) {
        log.error("Erro inesperado na API", e);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "Erro inesperado no servidor. Veja os detalhes no terminal.");
    }

    private static ResponseEntity<Resposta> responder(HttpStatus status, String msg) {
        return ResponseEntity.status(status).body(new Resposta(false, msg));
    }
}
