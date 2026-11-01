package com.hotel.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * Reserva de um quarto por um hóspede. Tabela: reserva.
 * O período vale de [entrada, saida): o dia da saída pode ser a entrada de outra reserva.
 */
public class Reserva {

    private int id;
    private int quarto;
    private Hospede hospede;
    private StatusReserva status;
    private LocalDate entrada;
    private LocalDate saida;
    /** Soma do que foi lançado no frigobar (calculada a partir da tabela consumo). */
    private BigDecimal valorConsumido = BigDecimal.ZERO;
    private Instant criadaEm;
    private Instant checkinEm;
    private Instant finalizadaEm;

    /** Código mostrado no site: o id com 4 dígitos (0001, 0002...). Nunca é reaproveitado. */
    public String getCodigo() {
        return String.format("%04d", id);
    }

    /** Agendada ou hospedada: ainda ocupa o quarto no período. */
    @JsonIgnore
    public boolean isAtiva() {
        return status != StatusReserva.FINALIZADA;
    }

    @JsonIgnore
    public boolean temConsumo() {
        return valorConsumido.signum() > 0;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getQuarto() {
        return quarto;
    }

    public void setQuarto(int quarto) {
        this.quarto = quarto;
    }

    public Hospede getHospede() {
        return hospede;
    }

    public void setHospede(Hospede hospede) {
        this.hospede = hospede;
    }

    public StatusReserva getStatus() {
        return status;
    }

    public void setStatus(StatusReserva status) {
        this.status = status;
    }

    public LocalDate getEntrada() {
        return entrada;
    }

    public void setEntrada(LocalDate entrada) {
        this.entrada = entrada;
    }

    public LocalDate getSaida() {
        return saida;
    }

    public void setSaida(LocalDate saida) {
        this.saida = saida;
    }

    public BigDecimal getValorConsumido() {
        return valorConsumido;
    }

    public void setValorConsumido(BigDecimal valorConsumido) {
        this.valorConsumido = valorConsumido;
    }

    public Instant getCriadaEm() {
        return criadaEm;
    }

    public void setCriadaEm(Instant criadaEm) {
        this.criadaEm = criadaEm;
    }

    public Instant getCheckinEm() {
        return checkinEm;
    }

    public void setCheckinEm(Instant checkinEm) {
        this.checkinEm = checkinEm;
    }

    public Instant getFinalizadaEm() {
        return finalizadaEm;
    }

    public void setFinalizadaEm(Instant finalizadaEm) {
        this.finalizadaEm = finalizadaEm;
    }
}
