#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 GESTOR TECNOMATH · Junior162009/MindMathArcade
================================================================================
 Funcionalidades:
   - Agregar juegos manualmente (archivo local o URL externa)
   - Importar juegos desde archivos ZIP (detecta index.html automáticamente)
   - Explorador de archivos avanzado (abrir, editar, renombrar, eliminar,
     crear carpetas, subir archivos)
   - Sincronización con GitHub (push automático, commit manual, pull)
   - Visualización del estado de Git (últimos commits, estado)
================================================================================
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext, simpledialog
import os
import re
import subprocess
import shutil
import zipfile

# ──────────────────────────────────────────────
# Configuración del repositorio
# ──────────────────────────────────────────────
REPO_URL = "https://github.com/Junior162009/MindMathArcade"
REPO_BRANCH = "main"
DEFAULT_PROJECT_DIR = os.getcwd()

class TecnomathManager:
    def __init__(self, root):
        self.root = root
        self.root.title("Gestor Tecnomath · Junior162009/MindMathArcade")
        self.root.geometry("950x800")
        self.root.resizable(True, True)

        # Variables de proyecto
        self.project_dir = tk.StringVar(value=DEFAULT_PROJECT_DIR)
        self.status_text = tk.StringVar(value="Listo")

        # Variables del formulario para agregar juego
        self.tipo_enlace = tk.StringVar(value="local")
        self.archivo_url = tk.StringVar()
        self.nombre = tk.StringVar()
        self.descripcion = tk.StringVar()
        self.icono = tk.StringVar()
        self.categoria = tk.StringVar(value="retro")
        self.imagen_path = tk.StringVar()
        self.subir_github = tk.BooleanVar(value=True)
        self.mensaje_commit = tk.StringVar(value="Agregar nuevo juego al portal")

        # Variables para importación ZIP
        self.zip_path = tk.StringVar()
        self.folder_name = tk.StringVar()
        self.detected_main = tk.StringVar()

        # Variables para Git manual
        self.git_commit_msg = tk.StringVar(value="Cambios desde gestor Tecnomath")

        # Construir toda la interfaz
        self.crear_widgets()

        # Ahora que la interfaz está lista, actualizar los datos
        self.actualizar_explorador()
        self.mostrar_estado_git()

    # ── CONSTRUCCIÓN DE LA INTERFAZ ─────────────────
    def crear_widgets(self):
        # Barra superior: selección de carpeta y estado
        frame_top = tk.Frame(self.root)
        frame_top.pack(fill="x", padx=10, pady=5)
        tk.Label(frame_top, text="📁 Proyecto:").pack(side="left")
        tk.Entry(frame_top, textvariable=self.project_dir, width=50).pack(side="left", padx=5)
        tk.Button(frame_top, text="Examinar", command=self.seleccionar_carpeta).pack(side="left")
        tk.Button(frame_top, text="🔄 Actualizar", command=self.actualizar_explorador).pack(side="left", padx=10)
        tk.Label(frame_top, textvariable=self.status_text, fg="blue").pack(side="left", padx=10)

        # Notebook (pestañas)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=5)

        # ── Pestaña 1: Agregar juego manualmente
        tab_add = tk.Frame(self.notebook)
        self.notebook.add(tab_add, text="➕ Agregar juego")
        self.crear_tab_agregar(tab_add)

        # ── Pestaña 2: Importar desde ZIP
        tab_zip = tk.Frame(self.notebook)
        self.notebook.add(tab_zip, text="📦 Importar ZIP")
        self.crear_tab_zip(tab_zip)

        # ── Pestaña 3: Explorador avanzado
        tab_explore = tk.Frame(self.notebook)
        self.notebook.add(tab_explore, text="📂 Explorar (avanzado)")
        self.crear_tab_explorar(tab_explore)

        # ── Pestaña 4: Git
        tab_git = tk.Frame(self.notebook)
        self.notebook.add(tab_git, text="🔧 Git")
        self.crear_tab_git(tab_git)

    # ── PESTAÑA AGREGAR JUEGO ──────────────────────
    def crear_tab_agregar(self, parent):
        frame = tk.Frame(parent)
        frame.pack(padx=20, pady=10, fill="x")

        # Nombre
        tk.Label(frame, text="Nombre del juego:").grid(row=0, column=0, sticky="w", pady=2)
        tk.Entry(frame, textvariable=self.nombre, width=40).grid(row=0, column=1, padx=5, pady=2)

        # Descripción
        tk.Label(frame, text="Descripción breve:").grid(row=1, column=0, sticky="w", pady=2)
        tk.Entry(frame, textvariable=self.descripcion, width=40).grid(row=1, column=1, padx=5, pady=2)

        # Tipo de enlace (local / URL)
        tk.Label(frame, text="Tipo de enlace:").grid(row=2, column=0, sticky="w", pady=10)
        frame_tipo = tk.Frame(frame)
        frame_tipo.grid(row=2, column=1, sticky="w")
        tk.Radiobutton(frame_tipo, text="Archivo local", variable=self.tipo_enlace, value="local", command=self.actualizar_label).pack(side="left")
        tk.Radiobutton(frame_tipo, text="URL externa", variable=self.tipo_enlace, value="url", command=self.actualizar_label).pack(side="left", padx=15)

        # Archivo / URL
        self.label_archivo = tk.Label(frame, text="Nombre del archivo (ej: snake.html):")
        self.label_archivo.grid(row=3, column=0, sticky="w", pady=2)
        frame_arch = tk.Frame(frame)
        frame_arch.grid(row=3, column=1, sticky="w")
        tk.Entry(frame_arch, textvariable=self.archivo_url, width=30).pack(side="left")
        tk.Button(frame_arch, text="Buscar", command=self.buscar_archivo).pack(side="left", padx=5)

        # Imagen personalizada
        tk.Label(frame, text="Imagen (opcional):").grid(row=4, column=0, sticky="w", pady=2)
        frame_img = tk.Frame(frame)
        frame_img.grid(row=4, column=1, sticky="w")
        tk.Entry(frame_img, textvariable=self.imagen_path, width=30).pack(side="left")
        tk.Button(frame_img, text="Buscar img", command=self.buscar_imagen).pack(side="left", padx=5)

        # Emoji
        tk.Label(frame, text="Emoji:").grid(row=5, column=0, sticky="w", pady=2)
        tk.Entry(frame, textvariable=self.icono, width=10).grid(row=5, column=1, sticky="w", padx=5)

        # Categoría
        tk.Label(frame, text="Categoría:").grid(row=6, column=0, sticky="w", pady=2)
        categorias = ["mates", "eco", "kids", "puzzle", "retro", "runners", "otros"]
        combo = ttk.Combobox(frame, textvariable=self.categoria, values=categorias, state="readonly", width=15)
        combo.grid(row=6, column=1, sticky="w", padx=5)

        # Subir a GitHub
        tk.Checkbutton(frame, text="Subir automáticamente a GitHub", variable=self.subir_github).grid(row=7, column=0, columnspan=2, sticky="w", pady=10)
        tk.Label(frame, text="Mensaje de commit:").grid(row=8, column=0, sticky="w")
        tk.Entry(frame, textvariable=self.mensaje_commit, width=40).grid(row=8, column=1, padx=5, pady=2)

        # Botón Agregar
        tk.Button(frame, text="➕ Agregar juego", command=self.agregar_juego, bg="#4CAF50", fg="white", font=("Arial", 12, "bold")).grid(row=9, column=0, columnspan=2, pady=20)

    def actualizar_label(self):
        if self.tipo_enlace.get() == "url":
            self.label_archivo.config(text="URL completa (ej: https://ejemplo.com/juego.html):")
        else:
            self.label_archivo.config(text="Nombre del archivo (ej: snake.html):")

    def buscar_archivo(self):
        archivo = filedialog.askopenfilename(title="Seleccionar archivo HTML", filetypes=[("HTML files", "*.html"), ("All files", "*.*")])
        if archivo:
            nombre = os.path.basename(archivo)
            self.archivo_url.set(nombre)
            destino = os.path.join(self.project_dir.get(), nombre)
            if not os.path.exists(destino):
                shutil.copy(archivo, destino)
                self.status_text.set(f"Archivo '{nombre}' copiado al proyecto")
            else:
                self.status_text.set(f"'{nombre}' ya existe en el proyecto")
            self.actualizar_explorador()

    def buscar_imagen(self):
        img = filedialog.askopenfilename(title="Seleccionar imagen", filetypes=[("Image files", "*.png *.jpg *.jpeg *.gif"), ("All files", "*.*")])
        if img:
            img_dir = os.path.join(self.project_dir.get(), "img")
            os.makedirs(img_dir, exist_ok=True)
            nombre = os.path.basename(img)
            destino = os.path.join(img_dir, nombre)
            if not os.path.exists(destino):
                shutil.copy(img, destino)
            self.imagen_path.set(f"img/{nombre}")
            self.status_text.set(f"Imagen guardada en img/{nombre}")
            self.actualizar_explorador()

    def agregar_juego(self):
        nombre = self.nombre.get().strip()
        descripcion = self.descripcion.get().strip()
        url = self.archivo_url.get().strip()
        icono = self.icono.get().strip()
        categoria = self.categoria.get().strip()
        imagen = self.imagen_path.get().strip()

        if not nombre or not url or not icono:
            messagebox.showerror("Error", "Completa al menos: nombre, archivo/URL y emoji.")
            return

        if self.tipo_enlace.get() == "local":
            ruta_completa = os.path.join(self.project_dir.get(), url)
            if not os.path.exists(ruta_completa):
                messagebox.showerror("Error", f"El archivo '{url}' no se encontró en el proyecto.\nUsa el botón 'Buscar' para copiarlo, o importa desde ZIP.")
                return

        index_path = os.path.join(self.project_dir.get(), "index.html")
        if not os.path.exists(index_path):
            messagebox.showerror("Error", f"No se encontró index.html en la carpeta del proyecto.")
            return

        with open(index_path, 'r', encoding='utf-8') as f:
            contenido = f.read()

        nueva_entrada = f'''        {{
            name: "{nombre}",
            desc: "{descripcion}",
            url: "{url}",
            imageUrl: "{imagen}",
            icon: "{icono}",
            category: "{categoria}"
        }}'''

        patron = r'(const projects = \[)(.*?)(\];)'
        match = re.search(patron, contenido, re.DOTALL)
        if not match:
            messagebox.showerror("Error", "No se pudo encontrar el arreglo 'projects' en index.html")
            return

        antes = match.group(1)
        proyectos = match.group(2)
        despues = match.group(3)
        if proyectos.strip():
            nueva_lista = proyectos.rstrip() + ',\n' + nueva_entrada + '\n    '
        else:
            nueva_lista = '\n' + nueva_entrada + '\n    '

        nuevo_contenido = contenido[:match.start()] + antes + nueva_lista + despues + contenido[match.end():]

        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(nuevo_contenido)

        self.status_text.set(f"Juego '{nombre}' agregado al index.html")

        if self.subir_github.get():
            self.subir_cambios_github(nombre, url, imagen)

        messagebox.showinfo("Listo", f"Juego '{nombre}' agregado correctamente.")
        self.actualizar_explorador()
        self.limpiar_campos()

    def limpiar_campos(self):
        self.nombre.set("")
        self.descripcion.set("")
        self.archivo_url.set("")
        self.icono.set("")
        self.categoria.set("retro")
        self.tipo_enlace.set("local")
        self.imagen_path.set("")
        self.mensaje_commit.set("Agregar nuevo juego al portal")
        self.actualizar_label()

    # ── PESTAÑA IMPORTAR ZIP ───────────────────────
    def crear_tab_zip(self, parent):
        frame = tk.Frame(parent)
        frame.pack(padx=20, pady=10, fill="x")

        tk.Label(frame, text="Selecciona un archivo ZIP con el juego web:").grid(row=0, column=0, columnspan=3, sticky="w", pady=5)

        tk.Entry(frame, textvariable=self.zip_path, width=50).grid(row=1, column=0, padx=5)
        tk.Button(frame, text="Buscar ZIP", command=self.buscar_zip).grid(row=1, column=1)
        tk.Button(frame, text="Procesar ZIP", command=self.procesar_zip, bg="#2196F3", fg="white").grid(row=1, column=2, padx=10)

        tk.Label(frame, text="Nombre de la carpeta (se creará dentro del proyecto):").grid(row=2, column=0, columnspan=3, sticky="w", pady=(15,0))
        tk.Entry(frame, textvariable=self.folder_name, width=40).grid(row=3, column=0, columnspan=3, padx=5)

        tk.Label(frame, text="Archivo principal detectado:").grid(row=4, column=0, columnspan=3, sticky="w", pady=(15,0))
        tk.Entry(frame, textvariable=self.detected_main, width=60, state="readonly").grid(row=5, column=0, columnspan=3, padx=5)

        tk.Button(frame, text="⬇️ Usar estos datos para agregar juego", command=self.usar_datos_zip, bg="#FF9800", fg="white").grid(row=6, column=0, columnspan=3, pady=20)

    def buscar_zip(self):
        archivo = filedialog.askopenfilename(title="Seleccionar archivo ZIP", filetypes=[("ZIP files", "*.zip")])
        if archivo:
            self.zip_path.set(archivo)
            nombre_base = os.path.splitext(os.path.basename(archivo))[0]
            self.folder_name.set(nombre_base)

    def procesar_zip(self):
        zip_file = self.zip_path.get()
        folder = self.folder_name.get().strip()
        if not zip_file or not folder:
            messagebox.showerror("Error", "Selecciona un archivo ZIP y asigna un nombre de carpeta.")
            return

        destino = os.path.join(self.project_dir.get(), folder)
        if os.path.exists(destino):
            if not messagebox.askyesno("Carpeta existente", f"La carpeta '{folder}' ya existe. ¿Deseas sobrescribirla?"):
                return
            shutil.rmtree(destino)
        os.makedirs(destino, exist_ok=True)

        try:
            with zipfile.ZipFile(zip_file, 'r') as z:
                z.extractall(destino)
            self.status_text.set(f"ZIP extraído en '{folder}'")
            main_file = self.detectar_archivo_principal(destino)
            if main_file:
                rel_path = os.path.relpath(main_file, self.project_dir.get())
                self.detected_main.set(rel_path)
                self.status_text.set(f"Archivo principal detectado: {rel_path}")
            else:
                self.detected_main.set("No se encontró index.html/main.html")
                self.status_text.set("No se detectó archivo principal automáticamente")
            self.actualizar_explorador()
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo extraer el ZIP: {e}")

    def detectar_archivo_principal(self, carpeta):
        candidatos = ['index.html', 'main.html', 'game.html', 'default.html']
        for nombre in candidatos:
            path = os.path.join(carpeta, nombre)
            if os.path.isfile(path):
                return path
        for f in sorted(os.listdir(carpeta)):
            if f.endswith('.html'):
                return os.path.join(carpeta, f)
        for sub in sorted(os.listdir(carpeta)):
            subpath = os.path.join(carpeta, sub)
            if os.path.isdir(subpath):
                for nombre in candidatos:
                    path = os.path.join(subpath, nombre)
                    if os.path.isfile(path):
                        return path
                for f in sorted(os.listdir(subpath)):
                    if f.endswith('.html'):
                        return os.path.join(subpath, f)
        return None

    def usar_datos_zip(self):
        folder = self.folder_name.get().strip()
        main = self.detected_main.get().strip()
        if not folder or not main:
            messagebox.showerror("Error", "Primero procesa un ZIP y asegúrate de tener un archivo principal.")
            return

        self.nombre.set(folder.replace('_', ' ').title())
        self.descripcion.set("Juego importado desde ZIP")
        self.tipo_enlace.set("local")
        self.archivo_url.set(main)
        self.icono.set("🎮")
        self.categoria.set("retro")
        self.imagen_path.set("")
        self.mensaje_commit.set(f"Importar juego {folder} desde ZIP")

        # Cambiar a la pestaña de agregar
        self.notebook.select(0)
        self.status_text.set("Campos rellenados con los datos del ZIP. Revisa y pulsa 'Agregar juego'.")

    # ── PESTAÑA EXPLORADOR AVANZADO ────────────────
    def crear_tab_explorar(self, parent):
        frame = tk.Frame(parent)
        frame.pack(fill="both", expand=True, padx=5, pady=5)

        toolbar = tk.Frame(frame)
        toolbar.pack(fill="x", pady=5)
        tk.Button(toolbar, text="📂 Abrir", command=self.abrir_seleccionado).pack(side="left", padx=2)
        tk.Button(toolbar, text="✏️ Editar", command=self.editar_archivo).pack(side="left", padx=2)
        tk.Button(toolbar, text="📝 Renombrar", command=self.renombrar_item).pack(side="left", padx=2)
        tk.Button(toolbar, text="🗑️ Eliminar", command=self.eliminar_item).pack(side="left", padx=2)
        tk.Button(toolbar, text="📁 Nueva carpeta", command=self.nueva_carpeta).pack(side="left", padx=2)
        tk.Button(toolbar, text="⬆️ Subir archivo", command=self.subir_archivo).pack(side="left", padx=2)
        tk.Button(toolbar, text="🔄 Git Pull", command=self.git_pull).pack(side="left", padx=10)

        self.tree = ttk.Treeview(frame, columns=("size", "type"), show="tree headings", height=20)
        self.tree.heading("#0", text="Nombre")
        self.tree.heading("size", text="Tamaño")
        self.tree.heading("type", text="Tipo")
        self.tree.column("#0", width=350)
        self.tree.column("size", width=100)
        self.tree.column("type", width=80)
        self.tree.pack(side="left", fill="both", expand=True)

        scroll = ttk.Scrollbar(frame, orient="vertical", command=self.tree.yview)
        scroll.pack(side="right", fill="y")
        self.tree.configure(yscrollcommand=scroll.set)

        # Menú contextual
        self.context_menu = tk.Menu(self.root, tearoff=0)
        self.context_menu.add_command(label="Abrir", command=self.abrir_seleccionado)
        self.context_menu.add_command(label="Editar", command=self.editar_archivo)
        self.context_menu.add_command(label="Renombrar", command=self.renombrar_item)
        self.context_menu.add_command(label="Eliminar", command=self.eliminar_item)
        self.tree.bind("<Button-3>", self.mostrar_contextual)

    def mostrar_contextual(self, event):
        item = self.tree.identify_row(event.y)
        if item:
            self.tree.selection_set(item)
            self.context_menu.post(event.x_root, event.y_root)

    def obtener_seleccionado(self):
        sel = self.tree.selection()
        if not sel:
            return None
        return self.tree.item(sel[0], "text")

    def obtener_ruta_seleccionada(self):
        nombre = self.obtener_seleccionado()
        if not nombre:
            return None
        return os.path.join(self.project_dir.get(), nombre)

    def abrir_seleccionado(self):
        ruta = self.obtener_ruta_seleccionada()
        if not ruta:
            return
        if os.path.isfile(ruta):
            try:
                if os.name == 'nt':
                    os.startfile(ruta)
                else:
                    subprocess.run(["xdg-open", ruta])
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo abrir: {e}")
        else:
            messagebox.showinfo("Carpeta", "Es una carpeta, no se puede abrir directamente.")

    def editar_archivo(self):
        ruta = self.obtener_ruta_seleccionada()
        if not ruta or not os.path.isfile(ruta):
            messagebox.showwarning("Selecciona archivo", "Selecciona un archivo para editar.")
            return
        editor = tk.Toplevel(self.root)
        editor.title(f"Editando: {os.path.basename(ruta)}")
        editor.geometry("700x500")
        text_area = scrolledtext.ScrolledText(editor, wrap=tk.WORD, font=("Consolas", 10))
        text_area.pack(fill="both", expand=True, padx=5, pady=5)
        try:
            with open(ruta, 'r', encoding='utf-8') as f:
                text_area.insert("1.0", f.read())
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo leer: {e}")
            editor.destroy()
            return

        def guardar():
            try:
                with open(ruta, 'w', encoding='utf-8') as f:
                    f.write(text_area.get("1.0", tk.END))
                self.status_text.set(f"Archivo {os.path.basename(ruta)} guardado.")
                editor.destroy()
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo guardar: {e}")

        tk.Button(editor, text="💾 Guardar", command=guardar, bg="#4CAF50", fg="white").pack(side="left", padx=5, pady=5)
        tk.Button(editor, text="Cancelar", command=editor.destroy).pack(side="right", padx=5, pady=5)

    def renombrar_item(self):
        ruta = self.obtener_ruta_seleccionada()
        if not ruta:
            return
        nombre_actual = os.path.basename(ruta)
        nuevo = simpledialog.askstring("Renombrar", f"Nuevo nombre para '{nombre_actual}':", initialvalue=nombre_actual)
        if nuevo and nuevo != nombre_actual:
            nueva_ruta = os.path.join(os.path.dirname(ruta), nuevo)
            if os.path.exists(nueva_ruta):
                messagebox.showerror("Error", "Ya existe un archivo o carpeta con ese nombre.")
                return
            try:
                os.rename(ruta, nueva_ruta)
                self.status_text.set(f"Renombrado a {nuevo}")
                self.actualizar_explorador()
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo renombrar: {e}")

    def eliminar_item(self):
        ruta = self.obtener_ruta_seleccionada()
        if not ruta:
            return
        nombre = os.path.basename(ruta)
        if not messagebox.askyesno("Confirmar", f"¿Eliminar '{nombre}' permanentemente?"):
            return
        try:
            if os.path.isfile(ruta):
                os.remove(ruta)
            else:
                shutil.rmtree(ruta)
            self.status_text.set(f"Eliminado: {nombre}")
            self.actualizar_explorador()
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo eliminar: {e}")

    def nueva_carpeta(self):
        nombre = simpledialog.askstring("Nueva carpeta", "Nombre de la carpeta:")
        if nombre:
            ruta = os.path.join(self.project_dir.get(), nombre)
            if os.path.exists(ruta):
                messagebox.showerror("Error", "Ya existe.")
                return
            try:
                os.mkdir(ruta)
                self.status_text.set(f"Carpeta '{nombre}' creada.")
                self.actualizar_explorador()
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo crear: {e}")

    def subir_archivo(self):
        archivo = filedialog.askopenfilename(title="Seleccionar archivo")
        if archivo:
            destino = os.path.join(self.project_dir.get(), os.path.basename(archivo))
            if os.path.exists(destino):
                if not messagebox.askyesno("Sobrescribir", "El archivo ya existe. ¿Sobrescribir?"):
                    return
            try:
                shutil.copy(archivo, destino)
                self.status_text.set(f"Archivo copiado: {os.path.basename(archivo)}")
                self.actualizar_explorador()
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo copiar: {e}")

    def git_pull(self):
        try:
            subprocess.run(["git", "pull", "origin", REPO_BRANCH], check=True, cwd=self.project_dir.get())
            self.status_text.set("Repositorio actualizado (git pull)")
            self.actualizar_explorador()
            self.mostrar_estado_git()
        except subprocess.CalledProcessError as e:
            messagebox.showerror("Error", f"No se pudo hacer git pull.\nError: {e}")

    # ── PESTAÑA GIT ───────────────────────────────
    def crear_tab_git(self, parent):
        frame = tk.Frame(parent)
        frame.pack(fill="both", expand=True, padx=10, pady=5)

        # Área de texto para el estado de git
        self.git_text = scrolledtext.ScrolledText(frame, height=15, font=("Consolas", 10))
        self.git_text.pack(fill="both", expand=True)

        # Controles para commit y push manuales
        control_frame = tk.Frame(frame)
        control_frame.pack(fill="x", pady=5)

        tk.Label(control_frame, text="Mensaje:").pack(side="left", padx=(0,5))
        tk.Entry(control_frame, textvariable=self.git_commit_msg, width=50).pack(side="left", padx=5)
        tk.Button(control_frame, text="Commit & Push", command=self.git_commit_push, bg="#4CAF50", fg="white").pack(side="left", padx=5)
        tk.Button(control_frame, text="Pull", command=self.git_pull, bg="#2196F3", fg="white").pack(side="left", padx=5)
        tk.Button(control_frame, text="Actualizar estado", command=self.mostrar_estado_git).pack(side="left", padx=5)

        self.mostrar_estado_git()

    def git_commit_push(self):
        msg = self.git_commit_msg.get().strip()
        if not msg:
            messagebox.showerror("Error", "Escribe un mensaje de commit.")
            return
        try:
            subprocess.run(["git", "add", "-A"], check=True, cwd=self.project_dir.get())
            subprocess.run(["git", "commit", "-m", msg], check=True, cwd=self.project_dir.get())
            subprocess.run(["git", "push", "origin", REPO_BRANCH], check=True, cwd=self.project_dir.get())
            self.status_text.set("Commit y push realizados con éxito")
            self.mostrar_estado_git()
        except subprocess.CalledProcessError as e:
            messagebox.showerror("Error", f"No se pudo hacer commit/push.\nError: {e}")

    def mostrar_estado_git(self):
        if not hasattr(self, 'git_text'):
            return
        self.git_text.delete("1.0", tk.END)
        try:
            result = subprocess.run(["git", "status"], capture_output=True, text=True, cwd=self.project_dir.get())
            if result.returncode != 0:
                self.git_text.insert("1.0", "No se detectó un repositorio Git en esta carpeta.")
                return
            log = subprocess.run(["git", "log", "--oneline", "-5"], capture_output=True, text=True, cwd=self.project_dir.get())
            self.git_text.insert("1.0", "── Últimos commits ──\n")
            self.git_text.insert(tk.END, log.stdout if log.stdout else "Sin commits\n")
            self.git_text.insert(tk.END, "\n── Estado actual ──\n")
            self.git_text.insert(tk.END, result.stdout)
        except Exception as e:
            self.git_text.insert("1.0", f"Error al consultar Git: {e}")

    # ── SUBIDA A GITHUB (automática desde agregar juego) ──
    def subir_cambios_github(self, nombre, archivo_juego, imagen_path):
        try:
            archivos = ["index.html"]
            if self.tipo_enlace.get() == "local" and archivo_juego:
                archivos.append(archivo_juego)
            if imagen_path:
                archivos.append(imagen_path)
                img_dir = os.path.join(self.project_dir.get(), "img")
                if os.path.exists(img_dir):
                    archivos.append("img")

            for archivo in archivos:
                subprocess.run(["git", "add", archivo], check=True, cwd=self.project_dir.get())

            mensaje = self.mensaje_commit.get().strip() or f"Agregar {nombre}"
            subprocess.run(["git", "commit", "-m", mensaje], check=True, cwd=self.project_dir.get())
            subprocess.run(["git", "push", "origin", REPO_BRANCH], check=True, cwd=self.project_dir.get())

            self.status_text.set("Cambios subidos a GitHub correctamente")
            self.mostrar_estado_git()
        except subprocess.CalledProcessError as e:
            messagebox.showerror("Error", f"No se pudo completar la operación Git.\nError: {e}\n\nIntenta manualmente.")

    # ── ACTUALIZAR EXPLORADOR ─────────────────────
    def actualizar_explorador(self):
        if not hasattr(self, 'tree'):
            return
        self.tree.delete(*self.tree.get_children())
        try:
            directorio = self.project_dir.get()
            for item in sorted(os.listdir(directorio)):
                ruta = os.path.join(directorio, item)
                if os.path.isfile(ruta):
                    size = os.path.getsize(ruta)
                    size_str = f"{size//1024} KB" if size > 1024 else f"{size} B"
                    self.tree.insert("", "end", text=item, values=(size_str, "Archivo"))
                else:
                    self.tree.insert("", "end", text=item, values=("", "Carpeta"))
            self.status_text.set("Explorador actualizado")
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo leer el directorio: {e}")

    def seleccionar_carpeta(self):
        carpeta = filedialog.askdirectory(title="Seleccionar carpeta del proyecto")
        if carpeta:
            self.project_dir.set(carpeta)
            os.chdir(carpeta)
            self.actualizar_explorador()
            self.mostrar_estado_git()
            self.status_text.set("Carpeta cambiada")

# ── INICIO ────────────────────────────────────────
if __name__ == "__main__":
    root = tk.Tk()
    app = TecnomathManager(root)
    root.mainloop()
