package com.iadaf.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


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
    private Integer activityScore;
}
