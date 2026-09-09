package com.hotel.model;

public class ProdutoFrigobar {

    private String nomeProduto;
    private double preco;
    private int quantidade;

    public ProdutoFrigobar() {
    }

    public ProdutoFrigobar(String nomeProduto, double preco, int quantidade) {
        this.nomeProduto = nomeProduto;
        this.preco = preco;
        this.quantidade = quantidade;
    }

    public String getNomeProduto() {
        return nomeProduto;
    }

    public void setNomeProduto(String nomeProduto) {
        this.nomeProduto = nomeProduto;
    }

    public double getPreco() {
        return preco;
    }

    public void setPreco(double preco) {
        this.preco = preco;
    }

    public int getQuantidade() {
        return quantidade;
    }

    public void setQuantidade(int quantidade) {
        this.quantidade = quantidade;
    }

    public double calcularTotal(int qtdConsumida) {
        return preco * qtdConsumida;
    }
}
