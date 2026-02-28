import type Gio from 'gi://Gio';
import type { GoogleTask, GoogleTaskList } from './tasksManager.js';

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { GoogleTasksManager } from './tasksManager.js';

const EditTaskDialog = GObject.registerClass({
  GTypeName: 'GoogleTasksEditTaskDialog',
  Signals: {
    'task-updated': { param_types: [GObject.TYPE_STRING, GObject.TYPE_STRING] },
  },
}, class EditTaskDialog extends ModalDialog.ModalDialog {
  private _entry!: St.Entry;
  private _descriptionEntry!: St.Entry;

  _init() {
    super._init({
      styleClass: 'google-tasks-add-dialog',
      destroyOnClose: true,
    });

    const titleLabel = new St.Label({
      text: 'Edit Task',
      style_class: 'google-tasks-dialog-title',
    });
    this.contentLayout.add_child(titleLabel);

    this._entry = new St.Entry({
      style_class: 'google-tasks-dialog-entry',
      hint_text: 'Task title',
      can_focus: true,
      x_expand: true,
    });
    this.contentLayout.add_child(this._entry);

    this._descriptionEntry = new St.Entry({
      style_class: 'google-tasks-dialog-entry',
      hint_text: 'Description',
      can_focus: true,
      x_expand: true,
    });
    this.contentLayout.add_child(this._descriptionEntry);

    this.setButtons([
      {
        label: 'Cancel',
        action: () => this.close(),
        key: Clutter.KEY_Escape,
      },
      {
        label: 'Save',
        default: true,
        action: () => this._onSave(),
      },
    ]);

    this.setInitialKeyFocus(this._entry);
  }

  setTask(title: string, notes: string) {
    this._entry.set_text(title);
    this._descriptionEntry.set_text(notes);
  }

  _onSave() {
    const title = this._entry.get_text().trim();
    if (title.length > 0) {
      const description = this._descriptionEntry.get_text().trim();
      this.emit('task-updated', title, description);
    }
    this.close();
  }
});

const AddTaskDialog = GObject.registerClass({
  GTypeName: 'GoogleTasksAddTaskDialog',
  Signals: {
    'task-created': { param_types: [GObject.TYPE_STRING, GObject.TYPE_STRING] },
  },
}, class AddTaskDialog extends ModalDialog.ModalDialog {
  private _entry!: St.Entry;
  private _descriptionEntry!: St.Entry;

  _init() {
    super._init({
      styleClass: 'google-tasks-add-dialog',
      destroyOnClose: true,
    });

    const titleLabel = new St.Label({
      text: 'New Task',
      style_class: 'google-tasks-dialog-title',
    });
    this.contentLayout.add_child(titleLabel);

    this._entry = new St.Entry({
      style_class: 'google-tasks-dialog-entry',
      hint_text: 'Task title',
      can_focus: true,
      x_expand: true,
    });
    this.contentLayout.add_child(this._entry);

    this._descriptionEntry = new St.Entry({
      style_class: 'google-tasks-dialog-entry',
      hint_text: 'Description (optional)',
      can_focus: true,
      x_expand: true,
    });
    this.contentLayout.add_child(this._descriptionEntry);

    this.setButtons([
      {
        label: 'Cancel',
        action: () => this.close(),
        key: Clutter.KEY_Escape,
      },
      {
        label: 'Save',
        default: true,
        action: () => this._onAdd(),
      },
    ]);

    this.setInitialKeyFocus(this._entry);
  }

  _onAdd() {
    const title = this._entry.get_text().trim();
    if (title.length > 0) {
      const description = this._descriptionEntry.get_text().trim();
      this.emit('task-created', title, description);
    }
    this.close();
  }
});

const TasksSection = GObject.registerClass({
  GTypeName: 'GoogleTasksSection',
  Signals: {
    'add-task-clicked': {},
  },
}, class TasksSection extends St.Button {
  private _taskListDropdownButton!: St.Button;
  private _taskListDropdownLabel!: St.Label;
  private _taskListDropdownMenu!: PopupMenu.PopupMenu;
  private _taskListDropdownMenuManager!: PopupMenu.PopupMenuManager;
  private _activeTasksList!: St.BoxLayout;
  private _completedHeaderButton!: St.Button;
  private _completedChevronIcon!: St.Icon;
  private _completedTasksList!: St.BoxLayout;
  private _completedExpanded: boolean = false;

  _init() {
    super._init({
      style_class: 'weather-button',
      x_expand: true,
      can_focus: false,
      layout_manager: new Clutter.BoxLayout({ orientation: Clutter.Orientation.VERTICAL }),
    });

    const box = new St.BoxLayout({
      style_class: 'weather-box',
      orientation: Clutter.Orientation.VERTICAL,
      x_expand: true,
    });
    this.add_child(box);

    const titleBox = new St.BoxLayout({ style_class: 'weather-header-box' });

    this._taskListDropdownLabel = new St.Label({
      text: 'Task Lists',
      y_align: Clutter.ActorAlign.CENTER,
      x_expand: true,
    });
    this._taskListDropdownLabel.clutter_text.set_ellipsize(3); // Pango.EllipsizeMode.END

    const dropdownIcon = new St.Icon({
      icon_name: 'pan-down-symbolic',
      icon_size: 12,
    });

    const dropdownContent = new St.BoxLayout({
      x_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
    });
    dropdownContent.add_child(this._taskListDropdownLabel);
    dropdownContent.add_child(dropdownIcon);

    this._taskListDropdownButton = new St.Button({
      style_class: 'google-tasks-dropdown-button',
      can_focus: true,
      x_expand: true,
      child: dropdownContent,
    });

    this._taskListDropdownMenu = new PopupMenu.PopupMenu(this._taskListDropdownButton, 0.0, St.Side.TOP);
    Main.uiGroup.add_child(this._taskListDropdownMenu.actor);
    this._taskListDropdownMenu.actor.hide();

    this._taskListDropdownMenuManager = new PopupMenu.PopupMenuManager(this);
    this._taskListDropdownMenuManager.addMenu(this._taskListDropdownMenu);

    this._taskListDropdownButton.connect('clicked', () => {
      this._taskListDropdownMenu.toggle();
      return Clutter.EVENT_STOP;
    });

    const addButton = new St.Button({
      style_class: 'google-tasks-add-button',
      can_focus: true,
      y_align: Clutter.ActorAlign.CENTER,
      child: new St.Icon({
        icon_name: 'list-add-symbolic',
        icon_size: 15,
      }),
    });
    addButton.connect('clicked', () => {
      this.emit('add-task-clicked');
      return Clutter.EVENT_STOP;
    });

    titleBox.add_child(this._taskListDropdownButton);
    titleBox.add_child(addButton);
    box.add_child(titleBox);

    this._activeTasksList = new St.BoxLayout({
      style_class: 'tasks-list',
      orientation: Clutter.Orientation.VERTICAL,
      x_expand: true,
    });

    box.add_child(this._activeTasksList);

    const completedHeaderContent = new St.BoxLayout({
      x_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
    });
    const completedLabel = new St.Label({
      text: 'Completed',
      y_align: Clutter.ActorAlign.CENTER,
      x_expand: true,
      style_class: 'tasks-completed-label',
    });
    this._completedChevronIcon = new St.Icon({
      icon_name: 'pan-end-symbolic',
      icon_size: 12,
      style_class: 'tasks-completed-chevron',
    });
    completedHeaderContent.add_child(completedLabel);
    completedHeaderContent.add_child(this._completedChevronIcon);

    this._completedHeaderButton = new St.Button({
      style_class: 'tasks-completed-toggle',
      can_focus: true,
      x_expand: true,
      child: completedHeaderContent,
      visible: false,
    });
    this._completedHeaderButton.connect('clicked', () => {
      this._setCompletedExpanded(!this._completedExpanded);
      return Clutter.EVENT_STOP;
    });

    this._completedTasksList = new St.BoxLayout({
      style_class: 'tasks-list tasks-completed-list',
      orientation: Clutter.Orientation.VERTICAL,
      x_expand: true,
      visible: false,
    });

    box.add_child(this._completedHeaderButton);
    box.add_child(this._completedTasksList);

    this.connect('destroy', () => {
      this._taskListDropdownMenu.destroy();
    });
  }

  setTaskLists(taskLists: GoogleTaskList[], selectedTaskListId: string, onSelect: (taskListId: string) => void) {
    this._taskListDropdownMenu.removeAll();

    if (taskLists.length === 0) {
      this._taskListDropdownLabel.set_text('No task lists');
      this._taskListDropdownButton.reactive = false;
      this._taskListDropdownMenu.close();
      return;
    }

    this._taskListDropdownButton.reactive = true;
    const selectedTaskList = taskLists.find(list => list.id === selectedTaskListId) ?? taskLists[0];
    this._taskListDropdownLabel.set_text(selectedTaskList.title);

    for (const list of taskLists) {
      const dropdownItem = new PopupMenu.PopupMenuItem(list.title);
      if (list.id === selectedTaskListId)
        dropdownItem.setOrnament(PopupMenu.Ornament.CHECK);

      dropdownItem.connect('activate', () => {
        onSelect(list.id);
      });

      this._taskListDropdownMenu.addMenuItem(dropdownItem);
    }
  }

  private _createTaskRow(
    task: GoogleTask,
    isCompleted: boolean,
    onComplete?: (task: GoogleTask) => void,
    onUncomplete?: (task: GoogleTask) => void,
    onEdit?: (task: GoogleTask) => void,
  ) {
    const box = new St.BoxLayout({
      style_class: 'task-box',
      orientation: Clutter.Orientation.HORIZONTAL,
      y_align: Clutter.ActorAlign.CENTER,
      reactive: true,
      track_hover: true,
    });

    const radio = new St.Button({
      style_class: 'task-radio',
      can_focus: true,
      y_align: Clutter.ActorAlign.CENTER,
    });

    const checkIcon = new St.Icon({
      icon_name: 'object-select-symbolic',
      style_class: 'task-radio-check',
      icon_size: 15,
    });
    checkIcon.opacity = isCompleted ? 255 : 0;
    radio.set_child(checkIcon);

    radio.connect('notify::hover', () => {
      if (!isCompleted && !radio.has_style_class_name('task-radio-completed'))
        checkIcon.opacity = radio.hover ? 255 : 0;
    });

    const label = new St.Label({
      text: task.title,
      style_class: 'task-label',
      y_align: Clutter.ActorAlign.CENTER,
    });

    const textBox = new St.BoxLayout({
      orientation: Clutter.Orientation.VERTICAL,
      y_align: Clutter.ActorAlign.CENTER,
      x_expand: true,
    });
    textBox.add_child(label);

    if (task.notes) {
      const descLabel = new St.Label({
        text: task.notes,
        style_class: 'task-description',
        y_align: Clutter.ActorAlign.CENTER,
      });
      descLabel.clutter_text.set_line_wrap(true);
      descLabel.clutter_text.set_ellipsize(3); // Pango.EllipsizeMode.END
      descLabel.clutter_text.set_single_line_mode(false);
      textBox.add_child(descLabel);
    }

    if (isCompleted) {
      radio.add_style_class_name('task-radio-completed');
      label.add_style_class_name('task-label-completed');
      radio.connect('clicked', () => {
        radio.reactive = false;
        if (onUncomplete)
          onUncomplete(task);
      });
    }
    else {
      radio.connect('clicked', () => {
        radio.add_style_class_name('task-radio-completed');
        checkIcon.opacity = 255;
        label.add_style_class_name('task-label-completed');
        radio.reactive = false;
        if (onComplete)
          onComplete(task);
      });
    }

    const editButton = new St.Button({
      style_class: 'task-edit-button',
      can_focus: true,
      y_align: Clutter.ActorAlign.CENTER,
      child: new St.Icon({
        icon_name: 'document-edit-symbolic',
        icon_size: 12,
      }),
    });
    editButton.opacity = 0;

    if (onEdit) {
      editButton.connect('clicked', () => {
        onEdit(task);
        return Clutter.EVENT_STOP;
      });

      box.connect('notify::hover', () => {
        editButton.opacity = box.hover ? 255 : 0;
      });
    }

    box.add_child(radio);
    box.add_child(textBox);
    box.add_child(editButton);

    return box;
  }

  addTask(task: GoogleTask, onComplete?: (task: GoogleTask) => void, onEdit?: (task: GoogleTask) => void) {
    const row = this._createTaskRow(task, false, onComplete, undefined, onEdit);
    this._activeTasksList.add_child(row);
  }

  addCompletedTask(task: GoogleTask, onUncomplete?: (task: GoogleTask) => void, onEdit?: (task: GoogleTask) => void) {
    const row = this._createTaskRow(task, true, undefined, onUncomplete, onEdit);
    this._completedTasksList.add_child(row);
  }

  setCompletedTasks(tasks: GoogleTask[], onUncomplete?: (task: GoogleTask) => void, onEdit?: (task: GoogleTask) => void) {
    this._completedTasksList.destroy_all_children();

    if (tasks.length === 0) {
      this._completedHeaderButton.visible = false;
      this._completedTasksList.visible = false;
      return;
    }

    this._completedHeaderButton.visible = true;
    for (const task of tasks) {
      if (task.title)
        this.addCompletedTask(task, onUncomplete, onEdit);
    }

    this._setCompletedExpanded(this._completedExpanded);
  }

  private _setCompletedExpanded(expanded: boolean) {
    this._completedExpanded = expanded;
    this._completedTasksList.visible = this._completedExpanded;
    this._completedChevronIcon.icon_name = this._completedExpanded
      ? 'pan-down-symbolic'
      : 'pan-end-symbolic';
  }

  clearTasks() {
    this._activeTasksList.destroy_all_children();
    this._completedTasksList.destroy_all_children();
    this._completedHeaderButton.visible = false;
    this._setCompletedExpanded(false);
  }
});

type TasksSectionInstance = InstanceType<typeof TasksSection>;

const REFRESH_INTERVAL_SECONDS = 20; // 20 seconds
const REFRESH_INTERVAL_KEY = 'refresh-interval';
const TASK_SORT_ORDER_KEY = 'task-sort-order';
const SHOW_COMPLETED_TASKS_KEY = 'show-completed-tasks';
type TaskSortOrder = 'my-order' | 'date' | 'deadline' | 'starred-recently' | 'title';
const VALID_TASK_SORT_ORDERS = new Set<TaskSortOrder>(['my-order', 'date', 'deadline', 'starred-recently', 'title']);

export default class GoogleTasksExtension extends Extension {
  private _tasksSection: TasksSectionInstance | null = null;
  private _tasksManager: GoogleTasksManager | null = null;
  private _settings: Gio.Settings | null = null;
  private _settingsChangedId: number | null = null;
  private _sortOrderChangedId: number | null = null;
  private _showCompletedChangedId: number | null = null;
  private _refreshTimerId: number | null = null;
  private _taskCompleteRefreshTimerId: number | null = null;
  private _selectedTaskListId: string | null = null;
  private _taskLists: GoogleTaskList[] = [];
  private _activeTasksByListId: Map<string, GoogleTask[]> = new Map();
  private _completedTasksByListId: Map<string, GoogleTask[]> = new Map();

  enable() {
    this._settings = this.getSettings();

    this._tasksSection = new TasksSection();
    this._tasksManager = new GoogleTasksManager();
    const dateMenu = Main.panel.statusArea.dateMenu as any;
    if (!dateMenu) {
      Main.notify('Google Tasks Extension', 'Date menu not found');
      return;
    }

    const displaysSection = dateMenu._displaysSection;
    const displaysBox = displaysSection ? (displaysSection.get_child() as St.BoxLayout) : null;

    if (displaysBox) {
      displaysBox.add_child(this._tasksSection);
    }
    else {
      const parent = dateMenu._calendarColumn || dateMenu._calendar?.get_parent();
      if (parent)
        parent.add_child(this._tasksSection);
    }

    // this._tasksSection.connect('clicked', () => {
    //   Gio.AppInfo.launch_default_for_uri('https://tasks.google.com/', null);
    //   dateMenu.menu.close();
    // });

    this._tasksSection.connect('add-task-clicked', () => {
      dateMenu.menu.close();
      this._showAddTaskDialog();
    });

    if (this._settings) {
      this._settingsChangedId = this._settings.connect(`changed::${REFRESH_INTERVAL_KEY}`, () => {
        this._startRefreshTimer();
      });

      this._sortOrderChangedId = this._settings.connect(`changed::${TASK_SORT_ORDER_KEY}`, () => {
        this._renderCurrentTaskList();
      });

      this._showCompletedChangedId = this._settings.connect(`changed::${SHOW_COMPLETED_TASKS_KEY}`, () => {
        this._refreshTasks();
      });
    }

    this._refreshTasks();
    this._startRefreshTimer();
  }

  _getRefreshIntervalSeconds() {
    if (!this._settings)
      return REFRESH_INTERVAL_SECONDS;

    const configuredInterval = this._settings.get_int(REFRESH_INTERVAL_KEY);
    return configuredInterval > 0 ? configuredInterval : REFRESH_INTERVAL_SECONDS;
  }

  _showAddTaskDialog() {
    const dialog = new AddTaskDialog();
    dialog.connect('task-created', (_dialog: any, title: string, description: string) => {
      this._onAddTask(title, description, this._selectedTaskListId ?? undefined);
    });
    dialog.open();
  }

  async _onAddTask(title: string, description: string, taskListId?: string) {
    if (!this._tasksManager)
      return;

    try {
      await this._tasksManager.createTask(title, description || undefined, taskListId);
      this._refreshTasks();
    }
    catch (e) {
      console.error(`Google Tasks: Failed to add task: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  _startRefreshTimer() {
    this._stopRefreshTimer();
    this._refreshTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._getRefreshIntervalSeconds(), () => {
      this._refreshTasks();
      return GLib.SOURCE_CONTINUE;
    });
  }

  _stopRefreshTimer() {
    if (this._refreshTimerId !== null) {
      GLib.source_remove(this._refreshTimerId);
      this._refreshTimerId = null;
    }
  }

  _scheduleTaskCompleteRefresh() {
    this._stopTaskCompleteRefreshTimer();
    this._taskCompleteRefreshTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
      this._taskCompleteRefreshTimerId = null;
      this._refreshTasks();
      return GLib.SOURCE_REMOVE;
    });
  }

  _stopTaskCompleteRefreshTimer() {
    if (this._taskCompleteRefreshTimerId !== null) {
      GLib.source_remove(this._taskCompleteRefreshTimerId);
      this._taskCompleteRefreshTimerId = null;
    }
  }

  _renderCurrentTaskList() {
    if (!this._tasksSection)
      return;

    if (this._taskLists.length === 0) {
      this._tasksSection.setTaskLists([], '', () => {});
      this._tasksSection.clearTasks();
      this._tasksSection.addTask({ id: '', title: 'No task lists found', status: 'none' });
      return;
    }

    if (!this._selectedTaskListId || !this._taskLists.some(l => l.id === this._selectedTaskListId))
      this._selectedTaskListId = this._taskLists[0].id;

    const selectedTaskListId = this._selectedTaskListId;
    this._tasksSection.setTaskLists(this._taskLists, selectedTaskListId, (taskListId) => {
      this._selectedTaskListId = taskListId;
      this._renderCurrentTaskList();
    });

    const activeTasks = this._sortTasks(this._activeTasksByListId.get(selectedTaskListId) ?? []);
    const showCompletedTasks = this._getShowCompletedTasks();
    const completedTasks = showCompletedTasks
      ? this._sortTasks(this._completedTasksByListId.get(selectedTaskListId) ?? [])
      : [];
    this._tasksSection.clearTasks();

    if (activeTasks.length === 0 && (!showCompletedTasks || completedTasks.length === 0)) {
      this._tasksSection.addTask({ id: '', title: 'No tasks found', status: 'none' });
      return;
    }

    for (const task of activeTasks) {
      if (task.title)
        this._tasksSection.addTask(task, t => this._onTaskCompleted(t), t => this._onTaskEdit(t));
    }

    if (showCompletedTasks)
      this._tasksSection.setCompletedTasks(completedTasks, t => this._onTaskUncompleted(t), t => this._onTaskEdit(t));
  }

  async _refreshTasks() {
    if (!this._tasksSection || !this._tasksManager) {
      Main.notify('Google Tasks Extension', 'Failed to init tasks section or manager.');
      return;
    }

    const includeCompletedTasks = this._getShowCompletedTasks();
    const taskLists = await this._tasksManager.getTaskLists();
    const allTasks = await this._tasksManager.getTasks(includeCompletedTasks);

    // Guard against being disabled while fetching
    if (!this._tasksSection || !this._tasksManager)
      return;

    this._taskLists = taskLists;
    this._activeTasksByListId = new Map(taskLists.map(list => [list.id, []] as [string, GoogleTask[]]));
    this._completedTasksByListId = new Map(taskLists.map(list => [list.id, []] as [string, GoogleTask[]]));

    for (const task of allTasks) {
      if (!task.taskListId)
        continue;

      if (task.status === 'completed') {
        const completedListTasks = this._completedTasksByListId.get(task.taskListId);
        if (completedListTasks)
          completedListTasks.push(task);
      }
      else {
        const activeListTasks = this._activeTasksByListId.get(task.taskListId);
        if (activeListTasks)
          activeListTasks.push(task);
      }
    }

    this._renderCurrentTaskList();
  }

  _getTaskSortOrder(): TaskSortOrder {
    if (!this._settings)
      return 'my-order';

    const configuredSortOrder = this._settings.get_string(TASK_SORT_ORDER_KEY);
    return VALID_TASK_SORT_ORDERS.has(configuredSortOrder as TaskSortOrder)
      ? configuredSortOrder as TaskSortOrder
      : 'my-order';
  }

  _getShowCompletedTasks(): boolean {
    if (!this._settings)
      return true;

    return this._settings.get_boolean(SHOW_COMPLETED_TASKS_KEY);
  }

  _sortTasks(tasks: GoogleTask[]): GoogleTask[] {
    const sortedTasks = [...tasks];
    const sortOrder = this._getTaskSortOrder();

    switch (sortOrder) {
      case 'title':
        sortedTasks.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'date':
      case 'starred-recently':
        sortedTasks.sort((a, b) => this._parseTimestamp(b.updated) - this._parseTimestamp(a.updated));
        break;
      case 'deadline':
        sortedTasks.sort((a, b) => this._compareDeadline(a.due, b.due));
        break;
      case 'my-order':
      default:
        sortedTasks.sort((a, b) => this._comparePosition(a.position, b.position));
        break;
    }

    return sortedTasks;
  }

  _parseTimestamp(value?: string): number {
    if (!value)
      return 0;

    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  _compareDeadline(left?: string, right?: string): number {
    const leftTimestamp = this._parseTimestamp(left);
    const rightTimestamp = this._parseTimestamp(right);

    if (leftTimestamp === 0 && rightTimestamp === 0)
      return 0;
    if (leftTimestamp === 0)
      return 1;
    if (rightTimestamp === 0)
      return -1;

    return leftTimestamp - rightTimestamp;
  }

  _comparePosition(left?: string, right?: string): number {
    if (!left && !right)
      return 0;
    if (!left)
      return 1;
    if (!right)
      return -1;

    return left.localeCompare(right);
  }

  _onTaskEdit(task: GoogleTask) {
    const dateMenu = Main.panel.statusArea.dateMenu as any;
    if (dateMenu)
      dateMenu.menu.close();

    const dialog = new EditTaskDialog();
    dialog.setTask(task.title, task.notes || '');
    dialog.connect('task-updated', async (_dialog: any, title: string, description: string) => {
      if (!this._tasksManager || !task.taskListId)
        return;
      try {
        await this._tasksManager.updateTask(task.taskListId, task.id, title, description);
        this._refreshTasks();
      }
      catch (e) {
        console.error(`Google Tasks: Failed to update task: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
    dialog.open();
  }

  async _onTaskCompleted(task: GoogleTask) {
    if (!this._tasksManager || !task.taskListId)
      return;

    try {
      await this._tasksManager.completeTask(task.taskListId, task.id);
      // Brief delay so the completed animation is visible before refreshing
      this._scheduleTaskCompleteRefresh();
    }
    catch (e) {
      console.error(`Google Tasks: Failed to mark task completed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async _onTaskUncompleted(task: GoogleTask) {
    if (!task.taskListId)
      return;

    const taskListId = task.taskListId;

    const completedTasks = this._completedTasksByListId.get(taskListId);
    if (completedTasks) {
      const taskIndex = completedTasks.findIndex(t => t.id === task.id);
      if (taskIndex >= 0)
        completedTasks.splice(taskIndex, 1);
    }

    const activeTasks = this._activeTasksByListId.get(taskListId);
    if (activeTasks)
      activeTasks.push({ ...task, status: 'needsAction' });

    this._renderCurrentTaskList();

    if (!this._tasksManager)
      return;

    try {
      await this._tasksManager.uncompleteTask(taskListId, task.id);
      this._refreshTasks();
    }
    catch (e) {
      console.error(`Google Tasks: Failed to mark task unfinished: ${e instanceof Error ? e.message : String(e)}`);
      this._refreshTasks();
    }
  }

  disable() {
    this._stopRefreshTimer();
    this._stopTaskCompleteRefreshTimer();

    if (this._settings && this._settingsChangedId !== null) {
      this._settings.disconnect(this._settingsChangedId);
      this._settingsChangedId = null;
    }

    if (this._settings && this._sortOrderChangedId !== null) {
      this._settings.disconnect(this._sortOrderChangedId);
      this._sortOrderChangedId = null;
    }

    if (this._settings && this._showCompletedChangedId !== null) {
      this._settings.disconnect(this._showCompletedChangedId);
      this._showCompletedChangedId = null;
    }
    this._settings = null;

    this._selectedTaskListId = null;
    this._taskLists = [];
    this._activeTasksByListId.clear();
    this._completedTasksByListId.clear();

    if (this._tasksManager) {
      this._tasksManager.destroy();
      this._tasksManager = null;
    }

    if (this._tasksSection) {
      this._tasksSection.destroy();
      this._tasksSection = null;
    }
  }
}
