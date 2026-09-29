<div align="center">

# 🏨 JavaHotel

### Sistema de reservas de hotel com frigobar

<a href="https://javahotel-peach.vercel.app/">
  <img src="https://img.shields.io/badge/🌐_ACESSAR_SITE-javahotel--peach.vercel.app-2563eb?style=for-the-badge&labelColor=0f172a" alt="Acessar site" />
</a>

<br/><br/>

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Java](https://img.shields.io/badge/Java-25-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)](https://javahotel-peach.vercel.app/)

</div>

---

## 🔗 Link de acesso

<div align="center">

**Aplicação em produção:** [javahotel-peach.vercel.app](https://javahotel-peach.vercel.app/)

</div>

> O projeto é publicado exclusivamente na Vercel. Não há instruções para execução local.

---

## ✨ O que dá pra fazer no site

- ✅ Reservar um quarto (número, nome, e-mail e telefone)
- ✅ Cancelar uma reserva
- ✅ Registrar consumo de um produto do frigobar em um quarto ocupado
- ✅ Ver o mapa de quartos (ocupado/livre) e o estoque do frigobar

> Os dados ficam salvos apenas no navegador de quem usa (`localStorage`). Não há banco de dados nem compartilhamento entre usuários.

---

## 🧱 Estrutura do projeto

```
JavaHotel/
├── public/                   # Site publicado na Vercel (estático)
│   ├── index.html            # Página do painel
│   ├── app.js                # Regras de reservas e frigobar
│   └── css/style.css         # Estilo da página
│
├── src/main/                 # Versão original em Spring Boot + Thymeleaf (referência de estudo)
├── console-app/              # Versão original em Java puro para terminal (referência de estudo)
└── pom.xml                   # Configuração Maven da versão Spring Boot
```

O projeto nasceu como estudo de Java em três formatos: console (Java puro), web com Spring Boot + Thymeleaf e, por fim, a versão estática em `public/`, que é a publicada. As três implementam as mesmas regras de negócio (quartos, hóspedes e frigobar); o código Java foi mantido apenas como referência de estudo.

---

## 🚀 Deploy

A pasta `public/` é servida como site estático na Vercel, sem etapa de build.
