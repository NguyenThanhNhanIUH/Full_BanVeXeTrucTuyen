# Build từ gốc repo (chứa backend-springboot + database) — dùng cho Render / Railway.
# database/data.sql được copy vào image để ConditionalSqlSeeder chạy được trên cloud (APP_DB_SEED_SCRIPT).

FROM maven:3.9.8-eclipse-temurin-17 AS build
WORKDIR /build
# Railway build container RAM hạn chế — tránh Maven bị Killed khi compile.
ENV MAVEN_OPTS="-Xmx384m -XX:+TieredCompilation -XX:TieredStopAtLevel=1"

COPY backend-springboot/pom.xml backend-springboot/
RUN cd backend-springboot && mvn -B -q dependency:go-offline -DskipTests || true
COPY backend-springboot/src backend-springboot/src
RUN cd backend-springboot && mvn -B -q -DskipTests clean package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /build/backend-springboot/target/account-management-0.0.1-SNAPSHOT.jar app.jar
COPY database /database

ENV APP_DB_SEED_SCRIPT=/database/data.sql
# Railway hobby RAM ~512MB — default JVM heap can OOM ("Killed" in deploy logs).
ENV JAVA_TOOL_OPTIONS=-Xms128m -Xmx384m -XX:+UseSerialGC
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java -jar app.jar --server.port=${PORT:-8080}"]
