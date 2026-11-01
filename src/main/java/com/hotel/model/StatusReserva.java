package com.hotel.model;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Ciclo de uma reserva:
 *   AGENDADA  → (check-in)             → HOSPEDADA
 *   HOSPEDADA → (encerrar + pagamento) → FINALIZADA
 *   AGENDADA  → (cancelar agendamento) → reserva apagada
 */
public enum StatusReserva {

    AGENDADA("agendada", "Agendado"),
    HOSPEDADA("hospedada", "Hospedado"),
    FINALIZADA("finalizada", "Finalizado");

    /** Valor gravado na coluna reserva.status e enviado ao site. */
    private final String codigo;
    /** Texto mostrado para as pessoas. */
    private final String rotulo;

    StatusReserva(String codigo, String rotulo) {
        this.codigo = codigo;
        this.rotulo = rotulo;
    }

    @JsonValue
    public String getCodigo() {
        return codigo;
    }

    public String getRotulo() {
        return rotulo;
    }

    public static StatusReserva deCodigo(String codigo) {
        for (StatusReserva s : values()) {
            if (s.codigo.equals(codigo)) return s;
        }
        throw new IllegalArgumentException("Status de reserva desconhecido: " + codigo);
    }
}
