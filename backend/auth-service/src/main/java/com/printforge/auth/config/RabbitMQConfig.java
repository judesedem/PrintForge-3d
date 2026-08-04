package com.printforge.auth.config;

import org.springframework.amqp.core.FanoutExchange;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "spring.rabbitmq.host", matchIfMissing = false)
public class RabbitMQConfig {
    public static final String USER_DELETED_EXCHANGE = "user.deleted.exchange";

    @Bean
    public FanoutExchange userDeletedExchange() {
        return new FanoutExchange(USER_DELETED_EXCHANGE);
    }
}
