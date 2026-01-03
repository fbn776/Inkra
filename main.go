package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/fbn776/inkra/config"
	"github.com/fbn776/inkra/database"
	"github.com/fbn776/inkra/routes"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
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

	r.Use(middleware.Recoverer)
	r.Use(middleware.Logger)

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

	http.ListenAndServe(":"+config.AppConfig.Port, r)
}
