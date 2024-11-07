
### LevelOfControl
- not_controllable：不能由任何扩展程序控制
- controlled_by_other_extensions：由优先级较高的扩展程序控制
- controllable_by_this_extension：可以通过此扩展程序控制
- controlled_by_this_extension：由此扩展程序控制



## ProxyConfig
chrome.proxy.Mode
- direct: 从不使用代理
- auto_detect: 自动检测代理设置
- pac_script: 使用指定的 PAC 脚本
- Fix_servers: 手动指定代理服务器
- system: 使用系统代理设置

### pacScript(可选)
此配置的代理自动配置 (PAC) 脚本。用于“pac_script”模式。

