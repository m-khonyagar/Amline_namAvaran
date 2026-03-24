from pydantic import BaseModel


class TaskCreateRequest(BaseModel):
    goal: str


class SettingsUpdateRequest(BaseModel):
    workspacePath: str | None = None
    safetyMode: str | None = None
    preferredModel: str | None = None


class ComputerSessionStartRequest(BaseModel):
    permission_mode: str = "safe"
    workspace_path: str | None = None


class ComputerCommandRequest(BaseModel):
    command: str
    timeout: int = 30
    admin: bool = False


class ComputerTextRequest(BaseModel):
    text: str


class ComputerHotkeyRequest(BaseModel):
    keys: list[str]


class ComputerClickRequest(BaseModel):
    x: int
    y: int
    button: str = "left"
    clicks: int = 1


class AssistantSessionCreateRequest(BaseModel):
    title: str | None = None
    mode: str = "chat"


class AssistantConnectorUpsertRequest(BaseModel):
    enabled: bool = True
    config: dict


class AssistantMessageRequest(BaseModel):
    content: str = ""
    attachments: list[dict] = []
    assigned_tools: list[dict] = []


class ImprovementConfigRequest(BaseModel):
    enabled: bool | None = None
    auto_review_interval_minutes: int | None = None
