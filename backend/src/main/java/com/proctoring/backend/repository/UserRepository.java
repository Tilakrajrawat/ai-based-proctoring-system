package com.proctoring.backend.repository;

import com.proctoring.backend.model.user.User;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {
    // add findByEmail, etc, later
}
