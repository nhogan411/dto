class ApplicationController < ActionController::API
  include JwtAuthenticatable
  include ErrorRenderable
  include GameSerializable
end
