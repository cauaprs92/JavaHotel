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
 
    // Getters e Setters
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
 
    // Reserva o quarto associando um hospede
    public void reservarQuarto(Hospede hospede) {
        if (ocupado) {
            System.out.println("  Quarto " + numero + " ja esta ocupado.");
            return;
        }
        this.hospede = hospede;
        this.ocupado = true;
        this.valorConsumido = 0.0;
        System.out.println("  Quarto " + numero + " reservado com sucesso para " + hospede.getNome() + ".");
    }
 
    // Cancela a reserva e libera o quarto
    public void cancelarReserva() {
        if (!ocupado) {
            System.out.println("  Quarto " + numero + " ja esta livre.");
            return;
        }
        System.out.println("  Reserva do quarto " + numero + " cancelada. Hospede: " + hospede.getNome());
        this.hospede = null;
        this.ocupado = false;
        this.valorConsumido = 0.0;
    }
 
    // Delega a exibicao dos dados ao Hospede
    public void consultarHospede() {
        if (!ocupado) {
            System.out.println("  Quarto " + numero + " esta livre.");
            return;
        }
        hospede.exibirDados();
    }
 
    // Adiciona valor ao consumo total do quarto
    public void adicionarConsumo(double valor) {
        this.valorConsumido += valor;
    }
 
    public void exibirResumo() {
        System.out.println("  Quarto  : " + numero);
        System.out.println("  Status  : " + (ocupado ? "Ocupado" : "Livre"));
        if (ocupado) {
            System.out.println("  Hospede : " + hospede.getNome());
            System.out.printf ("  Consumo : R$ %.2f%n", valorConsumido);
        }
    }
}