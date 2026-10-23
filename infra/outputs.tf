output "web_app_url" {
  description = "Public URL of the web app."
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "resource_group_name" {
  description = "Resource group holding everything for this environment."
  value       = azurerm_resource_group.main.name
}

output "web_app_name" {
  description = "Web app name, for `az webapp deploy --name`."
  value       = azurerm_linux_web_app.main.name
}
