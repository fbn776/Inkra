package lib

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/fbn776/inkra/config"
	"github.com/golang-jwt/jwt/v5"
)

func SendJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	err := json.NewEncoder(w).Encode(data)
	if err != nil {
		panic(err)
	}
}

func SuccessJSON(w http.ResponseWriter, status int, data any) {
	SendJSON(w, status, map[string]any{"success": true, "data": data})
}

func ErrorJSON(w http.ResponseWriter, status int, message string) {
	SendJSON(w, status, map[string]any{"success": false, "message": message})
}

type Claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

func GenerateJWT(email string) (string, error) {
	claims := Claims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(config.AppConfig.JwtSecret))
}

func CsvToSlice(input string) []string {
	parts := strings.Split(input, ",")
	result := make([]string, 0, len(parts))

	for _, p := range parts {
		v := strings.TrimSpace(p)
		if v != "" {
			result = append(result, v)
		}
	}

	return result
}
