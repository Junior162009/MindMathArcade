#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gestor de juegos para Tecnomath – Conexión directa con GitHub
Repositorio: Junior162009/MindMathArcade
Ejecutar: python3 agregar_juego_gui.py
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog, scrolledtext
import os
import re
import subprocess
import shutil
from datetime import datetime

# ──────────────────────────────────────────────
# Configuración del repositorio
# ──────────────────────────────────────────────
REPO_URL = "https://github.com/Junior162009/MindMathArcade"
REPO_BRANCH = "main"
DEFAULT_PROJECT_DIR = os.getcwd()  # Carpeta actual donde se ejecuta el script

class TecnomathManager:
    def __init__(self, root):
        self.root = root
        self.root.title("Gestor Tecnomath · Junior162009/MindMathArcade")
        self.root.geometry("800x650")
        self.root.resizable(True, True)

        # Variables de proyecto
        self.project_dir = tk.StringVar(value=DEFAULT_PROJECT_DIR)
        self.status_text = tk.StringVar(value="Listo")

        # Variables del juego nuevo
        self.tipo_enlace = tk.StringVar(value="local")
        self.archivo_url = tk.StringVar()
        self.nombre = tk.StringVar()
        self.descripcion = tk.StringVar()
        self.icono = tk.StringVar()
        self.categoria = tk.StringVar(value="retro")
        self.imagen_path = tk.StringVar()
        self.subir_github = tk.BooleanVar(value=True)
        self.mensaje_commit = tk.StringVar(value="Agregar nuevo juego al portal")

        self.crear_widgets()
        self.actualizar_explorador()
        self.mostrar_estado_git()

    # ── INTERFAZ GRÁFICA ────────────────────────
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
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill="both", expand=True, padx=10, pady=5)

        # ── Pestaña 1: Agregar juego
        tab_add = tk.Frame(notebook)
        notebook.add(tab_add, text="➕ Agregar juego")
        self.crear_tab_agregar(tab_add)

        # ── Pestaña 2: Explorar archivos
        tab_explore = tk.Frame(notebook)
        notebook.add(tab_explore, text="📂 Explorar proyecto")
        self.crear_tab_explorar(tab_explore)

        # ── Pestaña 3: Estado de Git
        tab_git = tk.Frame(notebook)
        notebook.add(tab_git, text="🔧 Git")
        self.crear_tab_git(tab_git)

    # ── PESTAÑA AGREGAR ────────────────────────
    def crear_tab_agregar(self, parent):
        frame = tk.Frame(parent)
        frame.pack(padx=20, pady=10, fill="x")

        # Nombre
        tk.Label(frame, text="Nombre del juego:").grid(row=0, column=0, sticky="w", pady=2)
        tk.Entry(frame, textvariable=self.nombre, width=40).grid(row=0, column=1, padx=5, pady=2)

        # Descripción
        tk.Label(frame, text="Descripción breve:").grid(row=1, column=0, sticky="w", pady=2)
        tk.Entry(frame, textvariable=self.descripcion, width=40).grid(row=1, column=1, padx=5, pady=2)

        # Tipo de enlace
        tk.Label(frame, text="Tipo de enlace:").grid(row=2, column=0, sticky="w", pady=10)
        frame_tipo = tk.Frame(frame)
        frame_tipo.grid(row=2, column=1, sticky="w")
        tk.Radiobutton(frame_tipo, text="Archivo local", variable=self.tipo_enlace, value="local", command=self.actualizar_label).pack(side="left")
        tk.Radiobutton(frame_tipo, text="URL externa", variable=self.tipo_enlace, value="url", command=self.actualizar_label).pack(side="left", padx=15)

        # Archivo/URL
        self.label_archivo = tk.Label(frame, text="Nombre del archivo (ej: snake.html):")
        self.label_archivo.grid(row=3, column=0, sticky="w", pady=2)
        frame_arch = tk.Frame(frame)
        frame_arch.grid(row=3, column=1, sticky="w")
        tk.Entry(frame_arch, textvariable=self.archivo_url, width=30).pack(side="left")
        tk.Button(frame_arch, text="Buscar", command=self.buscar_archivo).pack(side="left", padx=5)

        # Imagen
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

    # ── PESTAÑA EXPLORAR ───────────────────────
    def crear_tab_explorar(self, parent):
        frame = tk.Frame(parent)
        frame.pack(fill="both", expand=True, padx=10, pady=5)

        # Treeview para mostrar archivos/carpetas
        self.tree = ttk.Treeview(frame, columns=("size", "type"), show="tree headings", height=20)
        self.tree.heading("#0", text="Nombre")
        self.tree.heading("size", text="Tamaño")
        self.tree.heading("type", text="Tipo")
        self.tree.column("#0", width=300)
        self.tree.column("size", width=100)
        self.tree.column("type", width=80)
        self.tree.pack(side="left", fill="both", expand=True)

        scroll = ttk.Scrollbar(frame, orient="vertical", command=self.tree.yview)
        scroll.pack(side="right", fill="y")
        self.tree.configure(yscrollcommand=scroll.set)

        # Doble clic para abrir archivo
        self.tree.bind("<Double-1>", self.abrir_archivo)

    # ── PESTAÑA GIT ────────────────────────────
    def crear_tab_git(self, parent):
        frame = tk.Frame(parent)
        frame.pack(fill="both", expand=True, padx=10, pady=5)

        self.git_text = scrolledtext.ScrolledText(frame, height=20, font=("Consolas", 10))
        self.git_text.pack(fill="both", expand=True)

        tk.Button(frame, text="🔄 Actualizar estado", command=self.mostrar_estado_git).pack(pady=5)

    # ── FUNCIONALIDADES ─────────────────────────
    def seleccionar_carpeta(self):
        carpeta = filedialog.askdirectory(title="Seleccionar carpeta del proyecto")
        if carpeta:
            self.project_dir.set(carpeta)
            os.chdir(carpeta)
            self.actualizar_explorador()
            self.mostrar_estado_git()
            self.status_text.set("Carpeta cambiada")

    def actualizar_explorador(self):
        """Llena el Treeview con archivos y carpetas del directorio del proyecto."""
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

    def abrir_archivo(self, event):
        """Abre un archivo con el programa predeterminado del sistema."""
        seleccion = self.tree.selection()
        if seleccion:
            nombre = self.tree.item(seleccion[0], "text")
            ruta = os.path.join(self.project_dir.get(), nombre)
            if os.path.isfile(ruta):
                try:
                    if os.name == 'nt':  # Windows
                        os.startfile(ruta)
                    else:  # Linux/macOS
                        subprocess.run(["xdg-open", ruta])
                except Exception as e:
                    messagebox.showerror("Error", f"No se pudo abrir: {e}")

    def mostrar_estado_git(self):
        """Muestra el estado actual del repositorio Git."""
        self.git_text.delete("1.0", tk.END)
        try:
            # Verificar si es un repositorio git
            result = subprocess.run(["git", "status"], capture_output=True, text=True, cwd=self.project_dir.get())
            if result.returncode != 0:
                self.git_text.insert("1.0", "No se detectó un repositorio Git en esta carpeta.")
                return
            # Último commit
            log = subprocess.run(["git", "log", "--oneline", "-5"], capture_output=True, text=True, cwd=self.project_dir.get())
            self.git_text.insert("1.0", "── Últimos commits ──\n")
            self.git_text.insert(tk.END, log.stdout if log.stdout else "Sin commits\n")
            self.git_text.insert(tk.END, "\n── Estado actual ──\n")
            self.git_text.insert(tk.END, result.stdout)
        except Exception as e:
            self.git_text.insert("1.0", f"Error al consultar Git: {e}")

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

        # Verificar archivo local
        if self.tipo_enlace.get() == "local" and not os.path.exists(os.path.join(self.project_dir.get(), url)):
            messagebox.showerror("Error", f"El archivo '{url}' no se encontró en el proyecto.\nUsa el botón 'Buscar' para copiarlo.")
            return

        # Leer index.html
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
        nueva_lista = proyectos.rstrip() + ',\n' + nueva_entrada + '\n    ' if proyectos.strip() else '\n' + nueva_entrada + '\n    '
        nuevo_contenido = contenido[:match.start()] + antes + nueva_lista + despues + contenido[match.end():]

        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(nuevo_contenido)

        self.status_text.set(f"Juego '{nombre}' agregado al index.html")

        if self.subir_github.get():
            self.subir_cambios_github(nombre, url, imagen)

        messagebox.showinfo("Listo", f"Juego '{nombre}' agregado correctamente.\nNo olvides verificar el portal.")
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

    def subir_cambios_github(self, nombre, archivo_juego, imagen_path):
        try:
            archivos = ["index.html"]
            if self.tipo_enlace.get() == "local" and archivo_juego:
                archivos.append(archivo_juego)
            if imagen_path:
                archivos.append(imagen_path)

            for archivo in archivos:
                subprocess.run(["git", "add", archivo], check=True, cwd=self.project_dir.get())

            mensaje = self.mensaje_commit.get().strip() or f"Agregar {nombre}"
            subprocess.run(["git", "commit", "-m", mensaje], check=True, cwd=self.project_dir.get())
            subprocess.run(["git", "push", "origin", REPO_BRANCH], check=True, cwd=self.project_dir.get())

            self.status_text.set("Cambios subidos a GitHub correctamente")
            self.mostrar_estado_git()
        except subprocess.CalledProcessError as e:
            messagebox.showerror("Error", f"No se pudo completar la operación Git.\nError: {e}\n\nIntenta manualmente.")

# ── INICIO ────────────────────────────────────
if __name__ == "__main__":
    root = tk.Tk()
    app = TecnomathManager(root)
    root.mainloop()
