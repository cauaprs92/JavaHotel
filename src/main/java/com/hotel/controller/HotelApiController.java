package com.hotel.controller;

import java.sql.SQLException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.hotel.model.EstadoHotel;
import com.hotel.model.ItemConsumo;
import com.hotel.service.HotelService;

/**
 * API que o site (public/app.js) usa para ler e gravar no banco.
 *
 *   GET    /api/estado                   quartos, reservas e produtos
 *   POST   /api/reservas                 nova reserva (Agendado)
 *   PUT    /api/reservas/{id}            editar hóspede, quarto e datas
 *   POST   /api/reservas/{id}/checkin    Agendado → Hospedado
 *   POST   /api/reservas/{id}/finalizar  Hospedado → Finalizado
 *   DELETE /api/reservas/{id}            cancelar agendamento
 *   POST   /api/consumos                 lançar produtos do frigobar
 *   POST   /api/redefinir                restaurar dados de exemplo
 *
 * As alterações respondem { "ok": true, "msg": "..." }. Os erros são tratados em TratadorDeErros.
 */
@RestController
@RequestMapping("/api")
public class HotelApiController {

    /** Resposta das alterações: deu certo ou não, e a mensagem para mostrar na tela. */
    public record Resposta(boolean ok, String msg) {
        static Resposta sucesso(String msg) {
            return new Resposta(true, msg);
        }
    }

    public record DadosReserva(Integer quarto, String nome, String email, String telefone,
                               String entrada, String saida) {
    }

    public record DadosFinalizacao(Boolean pagamentoConfirmado) {
    }

    public record DadosConsumo(Integer quarto, List<ItemConsumo> itens) {
    }

    private final HotelService hotelService;

    public HotelApiController(HotelService hotelService) {
        this.hotelService = hotelService;
    }

    @GetMapping("/estado")
    public EstadoHotel estado() throws SQLException {
        return hotelService.carregarEstado();
    }

    @PostMapping("/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    public Resposta reservar(@RequestBody DadosReserva d) throws SQLException {
        return Resposta.sucesso(hotelService.reservar(d.quarto(), d.nome(), d.email(), d.telefone(), d.entrada(), d.saida()));
    }

    @PutMapping("/reservas/{id}")
    public Resposta editar(@PathVariable int id, @RequestBody DadosReserva d) throws SQLException {
        return Resposta.sucesso(hotelService.editarReserva(id, d.quarto(), d.nome(), d.email(), d.telefone(), d.entrada(), d.saida()));
    }

    @PostMapping("/reservas/{id}/checkin")
    public Resposta checkin(@PathVariable int id) throws SQLException {
        return Resposta.sucesso(hotelService.fazerCheckin(id));
    }

    @PostMapping("/reservas/{id}/finalizar")
    public Resposta finalizar(@PathVariable int id,
                              @RequestBody(required = false) DadosFinalizacao d) throws SQLException {
        boolean pago = d != null && Boolean.TRUE.equals(d.pagamentoConfirmado());
        return Resposta.sucesso(hotelService.finalizarReserva(id, pago));
    }

    @DeleteMapping("/reservas/{id}")
    public Resposta cancelar(@PathVariable int id) throws SQLException {
        return Resposta.sucesso(hotelService.cancelarAgendamento(id));
    }

    @PostMapping("/consumos")
    public Resposta consumo(@RequestBody DadosConsumo d) throws SQLException {
        return Resposta.sucesso(hotelService.registrarConsumo(d.quarto(), d.itens()));
    }

    @PostMapping("/redefinir")
    public Resposta redefinir() throws SQLException {
        return Resposta.sucesso(hotelService.redefinir());
    }
}
