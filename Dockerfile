# Build từ gốc repo (chứa backend-springboot + database) — dùng cho Render / Railway.
# database/data.sql được copy vào image để ConditionalSqlSeeder chạy được trên cloud (APP_DB_SEED_SCRIPT).

FROM maven:3.9.8-eclipse-temurin-17 AS build
WORKDIR /build

COPY backend-springboot/pom.xml backend-springboot/
COPY backend-springboot/src backend-springboot/src
RUN cd backend-springboot && mvn -DskipTests clean package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /build/backend-springboot/target/account-management-0.0.1-SNAPSHOT.jar app.jar
COPY database /database

ENV APP_DB_SEED_SCRIPT=/database/data.sql
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java ${JAVA_TOOL_OPTIONS} -jar app.jar --server.port=${PORT:-8080}"]
