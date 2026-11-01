package com.hotel.service;

/** Pedido que fere uma regra do hotel (quarto ocupado, data inválida...). A mensagem vai para a tela. */
public class RegraNegocioException extends RuntimeException {

    public RegraNegocioException(String mensagem) {
        super(mensagem);
    }
}
