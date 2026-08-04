package com.printforge.order.listener;

import com.printforge.order.config.RabbitMQConfig;
import com.printforge.order.queueservice.model.PrintJob;
import com.printforge.order.queueservice.repository.PrintJobRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "spring.rabbitmq.host", matchIfMissing = false)
public class UserEventListener {

    private final PrintJobRepository printJobRepository;

    public UserEventListener(PrintJobRepository printJobRepository) {
        this.printJobRepository = printJobRepository;
    }

    @RabbitListener(queues = RabbitMQConfig.ORDER_USER_DELETED_QUEUE)
    public void handleUserDeleted(Long userId) {
        List<PrintJob> jobs = printJobRepository.findByUserId(userId);
        if (!jobs.isEmpty()) {
            printJobRepository.deleteAll(jobs);
        }
    }
}
