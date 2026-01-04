package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/fbn776/inkra/config"
	"github.com/fbn776/inkra/database"
	middleware2 "github.com/fbn776/inkra/middleware"
	"github.com/fbn776/inkra/routes"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system env")
	}

	config.Load()

	if err := database.InitDB(); err != nil {
		log.Fatal(err)
	}

	if database.CheckIfInit() == false {
		fmt.Println("Application is not initialized")
		if err := config.RunInit(); err != nil {
			log.Fatal(err)
		}
	}

	r := chi.NewRouter()

	// CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // 5 minutes
	}))

	r.Use(middleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(httprate.LimitByIP(100, 1*time.Minute))

	r.Use(middleware2.Delay(1 * time.Second))

	fileServer := http.FileServer(http.Dir("./docs"))
	r.Handle("/docs/*", http.StripPrefix("/docs", fileServer))

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Home Page"))
	})

	r.Route("/api", func(r chi.Router) {
		routes.AuthRouter(r)
		routes.DocsRoutes(r)
	})

	r.NotFound(func(writer http.ResponseWriter, request *http.Request) {
		writer.WriteHeader(http.StatusNotFound)
		_, _ = writer.Write([]byte("404 page not found"))
	})

	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(405)
		w.Write([]byte("method is not valid"))
	})

	fmt.Println("Server started on port", config.AppConfig.Port)
	http.ListenAndServe(":"+config.AppConfig.Port, r)
}
