package com.hotel.model;

/**
 * Quarto do hotel. Tabela: quarto.
 * Se ele está livre, agendado ou hospedado depende das reservas, não do quarto.
 */
public class Quarto {

    private int numero;
    private int andar;

    public Quarto() {
    }

    public Quarto(int numero, int andar) {
        this.numero = numero;
        this.andar = andar;
    }

    public int getNumero() {
        return numero;
    }

    public void setNumero(int numero) {
        this.numero = numero;
    }

    public int getAndar() {
        return andar;
    }

    public void setAndar(int andar) {
        this.andar = andar;
    }
}
