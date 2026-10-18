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
COPY api-gateway/pom.xml api-gateway/
COPY api-gateway/src api-gateway/src

# Build the service JAR
RUN --mount=type=cache,target=/root/.m2,sharing=locked mvn -B -q -U -Daether.connector.http.retryHandler.count=5 -f api-gateway/pom.xml package -DskipTests

# --- Runtime ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/api-gateway/target/*.jar app.jar
# Alpine security fixes published since the base image; curl for the
# healthcheck; an unprivileged user to run the service.
RUN apk upgrade --no-cache \
 && apk add --no-cache curl \
 && addgroup -S app && adduser -S -G app app
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
