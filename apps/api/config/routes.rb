Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
  post "/signup", to: "auth#signup"
  post "/login", to: "auth#login"
  post "/refresh", to: "auth#refresh"
  delete "/logout", to: "auth#logout"
  get "/users/me", to: "auth#me"
  patch "/profile", to: "profiles#update"
  get "/friends", to: "friendships#index"
  get "/friends/search", to: "friendships#search"
  get "/friend_requests", to: "friendships#friend_requests"
  post "/friend_requests", to: "friendships#create"
  patch "/friend_requests/:id/accept", to: "friendships#accept"
  patch "/friend_requests/:id/decline", to: "friendships#decline"
  resources :player_characters, only: [ :index, :update ]

  resources :games, only: [ :create, :index, :show ] do
    member do
      patch :accept
      patch :decline
      patch :choose_position
      post :select_characters, to: "character_selections#create"
      get :attack_preview, to: "game_actions#attack_preview"
      get :state
      get :replay
      post :actions, to: "game_actions#create"
      get :actions, to: "game_actions#index"
    end
  end
end
