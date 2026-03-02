#include <a_samp>

main()
{
    print("Gamemode carregada com sucesso!");
}

public OnGameModeInit()
{
    SetGameModeText("GM do Rodolfo");
    AddPlayerClass(0, 1958.3783, 1343.1572, 15.3746, 0.0, 0,0,0,0,0,0);
    return 1;
}

public OnPlayerConnect(playerid)
{
    SendClientMessage(playerid, -1, "Bem-vindo ao servidor do Rodolfo!");
    return 1;
}
