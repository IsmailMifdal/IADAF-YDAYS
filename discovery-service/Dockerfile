# Le cache /root/.m2 est partagé entre builds (BuildKit) : les dépendances
# ne sont téléchargées qu'une fois, et -U + les retentatives absorbent les
# erreurs passagères de Maven Central (502, coupures) qui faisaient échouer
# toute la stack.
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /build

# Copy parent POM and install it locally
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2,sharing=locked mvn -B -q -U -Daether.connector.http.retryHandler.count=5 install -N

# Copy service POM and source
COPY discovery-service/pom.xml discovery-service/
COPY discovery-service/src discovery-service/src

# Build the service JAR
RUN --mount=type=cache,target=/root/.m2,sharing=locked mvn -B -q -U -Daether.connector.http.retryHandler.count=5 -f discovery-service/pom.xml package -DskipTests

# --- Runtime ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/discovery-service/target/*.jar app.jar
RUN apk add --no-cache curl
EXPOSE 8761
ENTRYPOINT ["java", "-jar", "app.jar"]
