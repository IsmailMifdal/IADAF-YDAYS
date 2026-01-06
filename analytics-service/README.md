# Analytics Service

## Description
Analytics and Reporting Service for IA-DAF (Intelligence Artificielle pour les Démarches Administratives Françaises).

This service provides statistical analysis and metrics aggregation across the platform, consolidating data from User, Demarches, and Document services.

## Features

- **Demarches Statistics**: Count and analysis by status, type, and priority
- **Document Statistics**: Total counts, sizes, and type distribution
- **User Activity Tracking**: Activity metrics and engagement scores
- **Temporal Evolution**: Time-series data for trends analysis
- **Dashboard Summaries**: Consolidated overview of platform metrics
- **Performance Metrics**: System health and performance indicators

## Technologies

- Spring Boot 3.2.0
- Spring Cloud Netflix Eureka (Service Discovery)
- Spring Security OAuth2 Resource Server (JWT)
- Spring Cache with Caffeine
- PostgreSQL (analytics schema)
- RestTemplate for inter-service communication
- Lombok

## Configuration

### Service Port
- **Port**: 8085

### Database
- **Schema**: analytics
- **URL**: jdbc:postgresql://localhost:5432/iadaf_db?currentSchema=analytics

### Service URLs (Inter-service Communication)
- User Service: http://localhost:8082
- Demarches Service: http://localhost:8083
- Document Service: http://localhost:8084

### Cache Configuration
- **Type**: Caffeine
- **TTL**: 300 seconds (5 minutes)
- **Max Size**: 1000 entries per cache

## API Endpoints

### Demarches Analytics

#### GET /analytics/demarches/statut
Get count of demarches grouped by status.
- **Access**: SUPPORT, ADMIN roles
- **Response**: Map<String, Long>

#### GET /analytics/demarches/type
Get count of demarches grouped by type.
- **Access**: SUPPORT, ADMIN roles
- **Response**: Map<String, Long>

#### GET /analytics/demarches/evolution
Get temporal evolution of demarches.
- **Access**: SUPPORT, ADMIN roles
- **Parameters**:
  - `startDate` (required): ISO date format
  - `endDate` (required): ISO date format
  - `period` (optional, default: DAILY): DAILY, WEEKLY, or MONTHLY
- **Response**: EvolutionDTO

### Documents Analytics

#### GET /analytics/documents/stats
Get document statistics including counts, sizes, and types.
- **Access**: SUPPORT, ADMIN roles
- **Response**: DocumentStatsDTO

### User Analytics

#### GET /analytics/users/activity
Get user activity metrics for all users.
- **Access**: SUPPORT, ADMIN roles
- **Response**: List<UserActivityDTO>

### Dashboard

#### GET /analytics/dashboard
Get dashboard summary with consolidated metrics.
- **Access**: USER, SUPPORT, ADMIN roles
- **Response**: DashboardSummaryDTO

### Performance

#### GET /analytics/performance
Get system performance metrics.
- **Access**: ADMIN role only
- **Response**: PerformanceMetricsDTO

## Security

### Authentication
All endpoints require JWT authentication via OAuth2/Keycloak.

### Authorization
- **ADMIN**: Full access to all endpoints
- **SUPPORT**: Access to analytics and user activity
- **USER**: Limited access (dashboard only)

### JWT Configuration
- **Issuer URI**: http://localhost:8180/realms/iadaf
- **JWK Set URI**: http://localhost:8180/realms/iadaf/protocol/openid-connect/certs

## Building and Running

### Build
```bash
mvn clean package -DskipTests
```

### Run
```bash
mvn spring-boot:run
```

Or using the packaged jar:
```bash
java -jar target/analytics-service-1.0.0-SNAPSHOT.jar
```

### Environment Variables
- `POSTGRES_USER`: Database username (default: iadaf_user)
- `POSTGRES_PASSWORD`: Database password (default: iadaf_password)
- `KEYCLOAK_ISSUER_URI`: Keycloak issuer URI
- `KEYCLOAK_JWK_SET_URI`: Keycloak JWK set URI
- `USER_SERVICE_URL`: User service URL
- `DEMARCHES_SERVICE_URL`: Demarches service URL
- `DOCUMENT_SERVICE_URL`: Document service URL

## Caching

The service implements caching for all analytics endpoints to reduce load on downstream services:

- **demarcheStats**: Cached for 5 minutes
- **documentStats**: Cached for 5 minutes
- **userActivity**: Cached for 5 minutes
- **dashboard**: Cached for 5 minutes
- **performance**: Cached for 5 minutes

Caches are automatically evicted after 300 seconds (5 minutes) or when the maximum size of 1000 entries is reached.

## Error Handling

The service provides comprehensive error handling:

- **ServiceUnavailableException**: Returns 503 when downstream services are unavailable
- **AccessDeniedException**: Returns 403 for insufficient permissions
- **AuthenticationException**: Returns 401 for invalid/expired JWT tokens
- **General Exceptions**: Returns 500 with error details

## Monitoring

Check service health:
```bash
curl http://localhost:8085/actuator/health
```

## Integration with Eureka

The service registers with Eureka Discovery Service at http://localhost:8761. Ensure Eureka is running before starting the analytics service.
