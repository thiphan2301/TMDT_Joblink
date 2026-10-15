package group7.joblink.controller;

import group7.joblink.dto.response.JobResponse;
import group7.joblink.service.JobService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping
    public List<JobResponse> getJobs() {
        return jobService.getJobs();
    }

    @GetMapping("/{id}")
    public JobResponse getJobDetail(
            @PathVariable("id") Integer id) {
        return jobService.getJobDetail(id);
    }
}