package com.hotel.model;

public class Quarto {

    private int numero;
    private boolean ocupado;
    private Hospede hospede;
    private double valorConsumido;

    public Quarto(int numero) {
        this.numero = numero;
        this.ocupado = false;
        this.hospede = null;
        this.valorConsumido = 0.0;
    }

    public int getNumero() {
        return numero;
    }

    public boolean isOcupado() {
        return ocupado;
    }

    public Hospede getHospede() {
        return hospede;
    }

    public double getValorConsumido() {
        return valorConsumido;
    }

    public void reservar(Hospede hospede) {
        this.hospede = hospede;
        this.ocupado = true;
        this.valorConsumido = 0.0;
    }

    public void cancelarReserva() {
        this.hospede = null;
        this.ocupado = false;
        this.valorConsumido = 0.0;
    }

    public void adicionarConsumo(double valor) {
        this.valorConsumido += valor;
    }
}
