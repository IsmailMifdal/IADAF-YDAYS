FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /build

# Copy parent POM and install it locally
COPY pom.xml .
RUN mvn install -N -q

# Copy service POM and source
COPY api-gateway/pom.xml api-gateway/
COPY api-gateway/src api-gateway/src

# Build the service JAR
RUN mvn -f api-gateway/pom.xml package -DskipTests -q

# --- Runtime ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/api-gateway/target/*.jar app.jar
RUN apk add --no-cache curl
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
