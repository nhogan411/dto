class ApplicationController < ActionController::API
  include JwtAuthenticatable
  include ErrorRenderable
end
