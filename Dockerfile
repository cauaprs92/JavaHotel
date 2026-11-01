# JavaHotel · imagem para publicar na nuvem (Render, Railway, Fly.io...).
# O banco fica fora da imagem: informe DB_URL, DB_USER e DB_PASSWORD nas variáveis de ambiente.

# ---------- 1) Compila o projeto ----------
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# Garante finais de linha Unix no mvnw (o checkout no Windows usa CRLF).
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
COPY public/ public/
RUN ./mvnw -B -q -DskipTests package

# ---------- 2) Só o necessário para rodar ----------
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/javahotel-web-1.0.0.jar app.jar

# A plataforma informa a porta pela variável PORT (sem ela, usa 8081).
EXPOSE 8081
CMD ["java", "-jar", "app.jar"]
