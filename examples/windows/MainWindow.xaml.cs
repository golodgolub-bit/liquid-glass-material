using System.IO;
using System.Text.Json;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace LiquidGlassHost;
public partial class MainWindow : Window
{
    private const string Origin = "https://glass.example";
    public MainWindow()
    {
        InitializeComponent();
        Loaded += InitializeGlass;
        Closed += (_, _) => GlassView.Dispose();
    }
    private async void InitializeGlass(object sender, RoutedEventArgs e)
    {
        try
        {
            var assets = Path.Combine(AppContext.BaseDirectory, "WebAssets");
            if (!File.Exists(Path.Combine(assets, "index.html"))) throw new FileNotFoundException("Run npm run build:hosts from the repository first.");
            var userData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LiquidGlassHost", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            await GlassView.EnsureCoreWebView2Async(environment);
            GlassView.CoreWebView2.SetVirtualHostNameToFolderMapping("glass.example", assets, CoreWebView2HostResourceAccessKind.DenyCors);
            GlassView.CoreWebView2.NavigationStarting += (_, args) =>
            {
                var uri = new Uri(args.Uri);
                if (uri.Scheme != "https" || uri.Host != "glass.example") args.Cancel = true;
            };
            GlassView.CoreWebView2.NewWindowRequested += (_, args) => args.Handled = true;
            GlassView.CoreWebView2.WebMessageReceived += (_, args) =>
            {
                if (!args.Source.StartsWith(Origin + "/", StringComparison.Ordinal)) return;
                using var json = JsonDocument.Parse(args.WebMessageAsJson);
                if (json.RootElement.TryGetProperty("type", out var type) && type.GetString() == "glass-action" && json.RootElement.TryGetProperty("action", out var action))
                    Title = $"Liquid Glass · {action.GetString()}";
            };
            GlassView.CoreWebView2.NavigationCompleted += async (_, args) =>
            {
                if (args.IsSuccess)
                {
                    var settings = JsonSerializer.Serialize(new { increasedContrast = SystemParameters.HighContrast });
                    await GlassView.ExecuteScriptAsync($"window.glassHost.setPlatform('Windows · WebView2'); window.glassHost.setAccessibility({settings});");
                }
            };
            GlassView.Source = new Uri(Origin + "/index.html");
        }
        catch (Exception error) { MessageBox.Show(error.Message, "Glass host initialization"); }
    }
}
