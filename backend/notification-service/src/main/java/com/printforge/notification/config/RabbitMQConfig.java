package com.printforge.notification.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String USER_DELETED_EXCHANGE = "user.deleted.exchange";
    public static final String NOTIFICATION_USER_DELETED_QUEUE = "notification.user.deleted.queue";

    @Bean
    public FanoutExchange userDeletedExchange() {
        return new FanoutExchange(USER_DELETED_EXCHANGE);
    }

    @Bean
    public Queue notificationUserDeletedQueue() {
        return new Queue(NOTIFICATION_USER_DELETED_QUEUE);
    }

    @Bean
    public Binding bindingUserDeleted(FanoutExchange userDeletedExchange, Queue notificationUserDeletedQueue) {
        return BindingBuilder.bind(notificationUserDeletedQueue).to(userDeletedExchange);
    }
}
