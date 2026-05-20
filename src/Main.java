import java.util.Scanner;
 
public class Main {
 
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Hotel hotel = new Hotel();
        int opcao = 0;
 
        System.out.println("=========================================");
        System.out.println("   SISTEMA DE RESERVAS - HOTEL JAVA     ");
        System.out.println("=========================================");
 
        do {
            System.out.println("\n--- MENU PRINCIPAL ---");
            System.out.println("1. Reservar Quarto");
            System.out.println("2. Cancelar Reserva");
            System.out.println("3. Listar Reservas");
            System.out.println("4. Consultar Hospede");
            System.out.println("5. Editar Dados do Hospede");
            System.out.println("6. Listar Produtos do Frigobar");
            System.out.println("7. Registrar Consumo do Frigobar");
            System.out.println("8. Calcular Valor Total do Quarto");
            System.out.println("0. Sair");
            System.out.print("Escolha: ");
 
            try {
                opcao = Integer.parseInt(sc.nextLine().trim());
            } catch (NumberFormatException e) {
                opcao = -1;
            }
 
            System.out.println();
 
            switch (opcao) {
                case 1: hotel.reservarQuarto(sc);          break;
                case 2: hotel.cancelarReserva(sc);         break;
                case 3: hotel.listarReservas();            break;
                case 4: hotel.consultarHospede(sc);        break;
                case 5: hotel.editarHospede(sc);           break;
                case 6: hotel.listarProdutosFrigobar();    break;
                case 7: hotel.registrarConsumoFrigobar(sc);break;
                case 8: hotel.calcularTotalQuarto(sc);     break;
                case 0: System.out.println("Encerrando o sistema. Ate mais!"); break;
                default: System.out.println("Opcao invalida. Tente novamente.");
            }
 
        } while (opcao != 0);
 
        sc.close();
    }
}
