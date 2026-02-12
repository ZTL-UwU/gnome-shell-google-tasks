import type { GoogleTask } from './tasksManager.js';

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

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
  private _titleLabel!: St.Label;
  private _tasksList!: St.BoxLayout;

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
    this._titleLabel = new St.Label({
      style_class: 'weather-header',
      text: 'Google Tasks',
      x_align: Clutter.ActorAlign.START,
      x_expand: true,
      y_align: Clutter.ActorAlign.END,
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

    titleBox.add_child(this._titleLabel);
    titleBox.add_child(addButton);
    box.add_child(titleBox);

    this._tasksList = new St.BoxLayout({
      style_class: 'tasks-list',
      orientation: Clutter.Orientation.VERTICAL,
      x_expand: true,
    });

    box.add_child(this._tasksList);
  }

  addTask(task: GoogleTask, onComplete?: (task: GoogleTask) => void, onEdit?: (task: GoogleTask) => void) {
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
    checkIcon.opacity = 0;
    radio.set_child(checkIcon);

    radio.connect('notify::hover', () => {
      if (!radio.has_style_class_name('task-radio-completed'))
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

    radio.connect('clicked', () => {
      radio.add_style_class_name('task-radio-completed');
      checkIcon.opacity = 255;
      label.add_style_class_name('task-label-completed');
      radio.reactive = false;
      if (onComplete)
        onComplete(task);
    });

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

    this._tasksList.add_child(box);
  }

  clearTasks() {
    this._tasksList.destroy_all_children();
  }
});

type TasksSectionInstance = InstanceType<typeof TasksSection>;

const REFRESH_INTERVAL_SECONDS = 20; // 20 seconds

export default class GoogleTasksExtension extends Extension {
  private _tasksSection: TasksSectionInstance | null = null;
  private _tasksManager: GoogleTasksManager | null = null;
  private _refreshTimerId: number | null = null;

  enable() {
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

    this._refreshTasks();
    this._startRefreshTimer();
  }

  _showAddTaskDialog() {
    const dialog = new AddTaskDialog();
    dialog.connect('task-created', (_dialog: any, title: string, description: string) => {
      this._onAddTask(title, description);
    });
    dialog.open();
  }

  async _onAddTask(title: string, description: string) {
    if (!this._tasksManager)
      return;

    try {
      await this._tasksManager.createTask(title, description || undefined);
      this._refreshTasks();
    }
    catch (e) {
      console.error(`Google Tasks: Failed to add task: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  _startRefreshTimer() {
    this._stopRefreshTimer();
    this._refreshTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, REFRESH_INTERVAL_SECONDS, () => {
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

  async _refreshTasks() {
    if (!this._tasksSection || !this._tasksManager) {
      Main.notify('Google Tasks Extension', 'Failed to init tasks section or manager.');
      return;
    }

    const tasks: GoogleTask[] = await this._tasksManager.getTasks();

    // Guard against being disabled while fetching
    if (!this._tasksSection || !this._tasksManager)
      return;

    this._tasksSection.clearTasks();

    if (tasks.length === 0) {
      this._tasksSection.addTask({ id: '', title: 'No tasks found', status: 'none' });
    }
    else {
      for (const task of tasks) {
        if (task.title) {
          this._tasksSection.addTask(task, t => this._onTaskCompleted(t), t => this._onTaskEdit(t));
        }
      }
    }
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
        await this._tasksManager.updateTask(task.taskListId, task.id, title, description || undefined);
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
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
        this._refreshTasks();
        return GLib.SOURCE_REMOVE;
      });
    }
    catch (e) {
      console.error(`Google Tasks: Failed to mark task completed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  disable() {
    this._stopRefreshTimer();

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
