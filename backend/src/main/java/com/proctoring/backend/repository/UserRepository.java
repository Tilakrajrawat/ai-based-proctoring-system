package com.proctoring.backend.repository;

import com.proctoring.backend.model.user.User;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class UserRepository {
    private final Map<String, User> users = new ConcurrentHashMap<>();
    
    public User save(User user) {
        users.put(user.getId(), user);
        return user;
    }
    
    public User findById(String id) {
        return users.get(id);
    }
    
    public List<User> findAll() {
        return new ArrayList<>(users.values());
    }
    
    public User findByEmail(String email) {
        return users.values().stream()
                .filter(user -> user.getEmail().equals(email))
                .findFirst()
                .orElse(null);
    }
    
    public void deleteById(String id) {
        users.remove(id);
    }
}
