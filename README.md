<div align="center">

# 🏨 JavaHotel

### Sistema de reservas de hotel com frigobar, em Java + PostgreSQL

<br/>

[![Java](https://img.shields.io/badge/Java-25-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-JDBC-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)

</div>

---

## ✨ O que dá pra fazer no site

- ✅ Reservar um quarto com **data de check-in e check-out**: a reserva ganha um **código de reserva** único (#0001, #0002…) e começa com o status **Agendado**
- ✅ Reservar um quarto que já está ocupado, para datas futuras: só aparecem os quartos livres no período escolhido, e o sistema não aceita períodos que se sobrepõem (o dia da saída de um hóspede pode ser o dia da entrada do próximo)
- ✅ Fazer o check-in: o status passa para **Hospedado**
- ✅ Encerrar a reserva confirmando o pagamento do frigobar: o status passa para **Finalizado** e ela fica no histórico
- ✅ Cancelar um agendamento (antes do check-in)
- ✅ Editar os dados do hóspede ou trocar de quarto
- ✅ Buscar reservas pelo código (`#0003`), hóspede, telefone ou quarto, filtrar por status, andar e consumo, e ordenar pelo código
- ✅ Lançar vários produtos do frigobar de uma vez em um quarto com hóspede no hotel
- ✅ Ver o mapa de quartos (livre, agendado ou hospedado) e o estoque do frigobar

```
Agendado ──check-in──▶ Hospedado ──encerrar (pagamento do frigobar)──▶ Finalizado
    └──cancelar agendamento──▶ (removida)
```

> Todos os dados ficam gravados em um banco **PostgreSQL**. Qualquer pessoa que abrir o site vê as mesmas reservas.

---

## 🧱 Como funciona

```
Navegador (public/)          Servidor Java (Spring Boot)                     Banco
┌───────────────────┐  HTTP  ┌───────────────────┐   ┌──────────────┐  JDBC  ┌────────────┐
│ index, quartos,   │ ─────▶ │ HotelApiController│ ─▶│ HotelService │ ─────▶ │ PostgreSQL │
│ reservas, frigobar│ ◀───── │   (/api/...)      │   │  (regras)    │  DAOs  │ javahotel  │
│ app.js            │  JSON  └───────────────────┘   └──────────────┘        └────────────┘
└───────────────────┘
```

- **Navegador** (`public/app.js`): busca tudo em `GET /api/estado` e envia cada ação (reservar, check-in, consumo…) para a API. Mostra a mensagem que o servidor devolve.
- **HotelService**: confere as regras do hotel (quarto livre, datas, estoque, pagamento) e faz cada operação dentro de uma **transação**: se algo falhar no meio, nada é gravado (`rollback`). Antes de alterar, trava a tabela de reservas para escrita, para que duas pessoas não reservem o mesmo quarto ao mesmo tempo.
- **DAOs** (`com.hotel.dao`): todo o acesso ao banco, com JDBC puro: `DriverManager`, `Connection`, `PreparedStatement` e `ResultSet`. Os erros de banco (`SQLException`) viram mensagens claras para a tela.

### Tabelas

| Tabela    | Guarda                                                                  |
| --------- | ----------------------------------------------------------------------- |
| `quarto`  | Os 20 quartos e o andar de cada um                                      |
| `hospede` | Nome, e-mail e telefone (o e-mail identifica a pessoa)                  |
| `reserva` | Quarto, hóspede, status, entrada, saída e as datas de check-in e saída  |
| `produto` | Produtos do frigobar, preço e estoque                                   |
| `consumo` | Cada produto lançado na conta de uma reserva, com o preço do momento    |

O total do frigobar de uma reserva é a soma das linhas de `consumo`. A estrutura completa está em [`schema.sql`](src/main/resources/banco/schema.sql) e é criada sozinha quando o servidor inicia.

### API

| Método   | Rota                            | O que faz                         |
| -------- | ------------------------------- | --------------------------------- |
| `GET`    | `/api/estado`                   | Quartos, reservas e produtos      |
| `POST`   | `/api/reservas`                 | Nova reserva (Agendado)           |
| `PUT`    | `/api/reservas/{id}`            | Edita hóspede, quarto e datas     |
| `POST`   | `/api/reservas/{id}/checkin`    | Agendado → Hospedado              |
| `POST`   | `/api/reservas/{id}/finalizar`  | Hospedado → Finalizado            |
| `DELETE` | `/api/reservas/{id}`            | Cancela um agendamento            |
| `POST`   | `/api/consumos`                 | Lança produtos do frigobar        |
| `POST`   | `/api/redefinir`                | Restaura os dados de exemplo      |

As alterações respondem `{ "ok": true, "msg": "..." }`; quando uma regra não é atendida, `{ "ok": false, "msg": "..." }` com status 400.

---

## 💻 Rodando na sua máquina

**Precisa de:** JDK 25 e PostgreSQL.

1. Crie o banco (no pgAdmin ou no `psql`):
   ```sql
   CREATE DATABASE javahotel;
   ```
2. Copie `banco.example.properties` para `banco.properties` e coloque a senha do seu PostgreSQL. Esse arquivo fica fora do git.
3. Na pasta do projeto, rode:
   ```bash
   ./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
   ```
4. Abra **http://localhost:8081**.

As tabelas, os 20 quartos e os produtos do frigobar são criados sozinhos na primeira vez. Se algo der errado com o banco (senha errada, banco não criado, PostgreSQL desligado), o terminal e o site dizem o que fazer.

---

## ☁️ Publicando na nuvem

A Vercel só serve sites estáticos, então ela não consegue rodar o servidor Java. Um caminho gratuito:

1. **Banco:** crie um PostgreSQL no [Neon](https://neon.tech) e copie os dados de conexão.
2. **Servidor:** no [Render](https://render.com), crie um *Blueprint* apontando para este repositório (ele lê o `render.yaml` e o `Dockerfile`) e preencha:
   - `DB_URL` = `jdbc:postgresql://<host-do-neon>/<banco>?sslmode=require`
   - `DB_USER` e `DB_PASSWORD` = usuário e senha do Neon
3. O Render dá um endereço (`https://javahotel-xxxx.onrender.com`) com o site e a API juntos.

**Para manter o endereço da Vercel**, crie um `vercel.json` na raiz que repassa a API para o Render:

```json
{
  "rewrites": [{ "source": "/api/:caminho*", "destination": "https://javahotel-xxxx.onrender.com/api/:caminho*" }]
}
```

---

## 📁 Estrutura do projeto

```
JavaHotel/
├── public/                          # Site (HTML, CSS e app.js)
├── src/main/java/com/hotel/
│   ├── controller/                  # API REST (HotelApiController) e tratamento de erros
│   ├── service/                     # Regras do hotel e transações (HotelService)
│   ├── dao/                         # JDBC: ConexaoBD, InicializadorBD e um DAO por tabela
│   └── model/                       # Quarto, Hospede, Reserva, ProdutoFrigobar...
├── src/main/resources/
│   ├── application.properties       # Porta e conexão com o banco
│   └── banco/                       # schema.sql (tabelas) e dados-iniciais.sql
├── banco.example.properties         # Modelo do arquivo com a senha do banco
├── Dockerfile · render.yaml         # Publicação na nuvem
└── console-app/                     # Primeira versão, em Java puro para terminal (referência de estudo)
```
