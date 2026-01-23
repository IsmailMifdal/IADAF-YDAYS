package com.iadaf.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserActivityDTO {
    private Long userId;
    private String userName;
    private String userEmail;
    private Long totalDemarches;
    private Long activeDemarches;
    private Long completedDemarches;
    private Long totalDocuments;
    private LocalDateTime lastActivityDate;
    private Integer activityScore;
}
