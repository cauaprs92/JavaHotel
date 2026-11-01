package com.hotel.model;

import java.util.List;

/** Tudo o que o site precisa para montar as telas, lido do banco de uma vez. */
public record EstadoHotel(List<Quarto> quartos, List<Reserva> reservas, List<ProdutoFrigobar> produtos) {
}
