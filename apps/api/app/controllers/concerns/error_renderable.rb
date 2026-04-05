module ErrorRenderable
  extend ActiveSupport::Concern

  private

  def render_unprocessable_entity(errors)
    render json: { errors: Array(errors) }, status: :unprocessable_entity
  end

  def render_forbidden(message = "Forbidden")
    render json: { errors: [ message ] }, status: :forbidden
  end

  def render_not_found(message = "Game not found")
    render json: { errors: [ message ] }, status: :not_found
  end
end
