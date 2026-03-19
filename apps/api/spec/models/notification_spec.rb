require "rails_helper"

RSpec.describe Notification, type: :model do
  subject(:notification) { build(:notification) }

  describe "associations" do
    it { is_expected.to belong_to(:user) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:event) }
  end

  describe ".unread" do
    it "returns only notifications without read_at" do
      described_class.delete_all

      unread_notification = create(:notification, read_at: nil)
      create(:notification, read_at: Time.current)

      expect(described_class.unread).to contain_exactly(unread_notification)
    end
  end
end
